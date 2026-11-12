import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  Logger, NotFoundException,
} from '@nestjs/common';
import { FreeStockStatus, Prisma } from '@prisma/client';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import * as ExcelJS from 'exceljs';
import { createReadStream } from 'fs';
import { PrismaService } from '../../../prisma.service';
import { ConfirmSelectedFreeStockDto, FreeStockPageDto, FreeStockQueryDto, ReserveFreeStockDto } from './free-stock.dto';
import {
  normalizeReservationLines, parseReservationFile, parseStockFile,
  ReservationInput, StockInput, StockFileResult, stockKey, skippedStockMatcher,
} from './free-stock-excel';

const STOCK_INCLUDE = {
  reservations: { where: { releasedAt: null }, orderBy: { id: 'desc' }, take: 1 },
} satisfies Prisma.FreeStockItemInclude;

type StockRecord = Prisma.FreeStockItemGetPayload<{ include: typeof STOCK_INCLUDE }>;
type Actor = Prisma.UserGetPayload<{ include: { salesZone: true } }>;

@Injectable()
export class FreeStockService {
  private readonly logger = new Logger(FreeStockService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async actor(userId: number, roles = ['ADMIN', 'SALES']): Promise<Actor> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { salesZone: true } });
    if (!user || !roles.includes(user.role)) throw new ForbiddenException('This action is not permitted for your account.');
    return user;
  }

  private async locked<T>(action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(74020005::bigint)::text`;
      return action(tx);
    }, { maxWait: 10000, timeout: 180000 });
  }

  private async stockFileHash(path: string): Promise<string> {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest('hex');
  }

  private stockPlan(parsed: StockFileResult, existing: { id: number; storageBin: string | null; materialCode: string; batch: string }[]) {
    const keys = new Set(parsed.rows.map((row) => stockKey(row.storageBin, row.materialCode, row.batch)));
    const known = new Set(existing.map((row) => stockKey(row.storageBin, row.materialCode, row.batch)));
    const invalidMatch = skippedStockMatcher(parsed.skippedIdentities);
    const protectedIds: number[] = [];
    let wouldCloseRows = 0;
    for (const row of existing) {
      if (keys.has(stockKey(row.storageBin, row.materialCode, row.batch))) continue;
      if (invalidMatch(row)) protectedIds.push(row.id);
      else wouldCloseRows++;
    }
    const updatedRows = parsed.rows.filter((row) => known.has(stockKey(row.storageBin, row.materialCode, row.batch))).length;
    return { insertedRows: parsed.rows.length - updatedRows, updatedRows, wouldCloseRows, protectedIds };
  }

  private signStockPreview(actorId: number, fileHash: string): string {
    const payload = Buffer.from(JSON.stringify({ actorId, fileHash, expiresAt: Date.now() + 30 * 60 * 1000 })).toString('base64url');
    const signature = createHmac('sha256', this.bulkPreviewKey()).update('free-stock-snapshot:' + payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  private checkStockPreview(token: string | undefined, actorId: number, fileHash: string) {
    const invalid = () => new ConflictException('The stock preview has changed or expired. Review the file again before importing.');
    if (!token) throw invalid();
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) throw invalid();
    const expected = createHmac('sha256', this.bulkPreviewKey()).update('free-stock-snapshot:' + payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw invalid();
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (data.actorId !== actorId || data.fileHash !== fileHash || typeof data.expiresAt !== 'number' || data.expiresAt <= Date.now()) throw invalid();
    } catch { throw invalid(); }
  }

  async previewStock(path: string, userId: number) {
    const actor = await this.actor(userId, ['ADMIN']);
    const [parsed, fileHash] = await Promise.all([parseStockFile(path), this.stockFileHash(path)]);
    const existing = await this.prisma.freeStockItem.findMany({
      where: { status: { not: 'CLOSED' } }, select: { id: true, storageBin: true, materialCode: true, batch: true },
    });
    const { protectedIds, ...plan } = this.stockPlan(parsed, existing);
    return { message: 'Stock preview only. No data was changed.', data: {
      totalRows: parsed.totalRows, validRows: parsed.rows.length, skippedRows: parsed.issues.length,
      ...plan, protectedRows: protectedIds.length, issues: parsed.issues,
      sample: parsed.rows.slice(0, 25), requiresFullSnapshot: true,
      canImport: parsed.rows.length > 0, previewToken: this.signStockPreview(actor.id, fileHash),
    } };
  }

  async uploadStock(path: string, fileName: string, userId: number, options: { skipInvalidRows?: boolean; previewToken?: string } = {}) {
    const actor = await this.actor(userId, ['ADMIN']);
    const [parsed, fileHash] = await Promise.all([parseStockFile(path), this.stockFileHash(path)]);
    this.checkStockPreview(options.previewToken, actor.id, fileHash);
    if (!parsed.rows.length) throw new BadRequestException('No valid stock rows are available to import. Nothing was saved.');
    if (parsed.issues.length && !options.skipInvalidRows) {
      throw new BadRequestException('The file contains invalid rows. Review them and choose Upload valid rows only, or cancel. Nothing was saved.');
    }
    const upload = await this.prisma.freeStockUpload.create({ data: { fileName, uploadedById: actor.id, uploadedByName: actor.name } });
    try {
      const result = await this.locked(async (tx) => {
        const live = await tx.freeStockItem.findMany({
          where: { status: { not: 'CLOSED' } }, select: { id: true, storageBin: true, materialCode: true, batch: true },
        });
        const plan = this.stockPlan(parsed, live);
        for (let offset = 0; offset < parsed.rows.length; offset += 500) {
          await this.upsertStock(tx, upload.id, parsed.rows.slice(offset, offset + 500));
        }
        // Invalid source rows are present in SAP: mark their existing records as seen,
        // preserving stock values, status, ownership and the original reservation.
        // Incomplete identities protect every potentially matching existing row.
        for (let offset = 0; offset < plan.protectedIds.length; offset += 500) {
          await tx.freeStockItem.updateMany({
            where: { id: { in: plan.protectedIds.slice(offset, offset + 500) }, status: { not: 'CLOSED' } },
            data: { lastSeenUploadId: upload.id },
          });
        }
        const missing: Prisma.FreeStockItemWhereInput = { status: { not: 'CLOSED' }, lastSeenUploadId: { not: upload.id } };
        const now = new Date();
        await tx.freeStockReservation.updateMany({
          where: { releasedAt: null, closedAt: null, stockItem: { is: missing } }, data: { closedAt: now },
        });
        const closed = await tx.freeStockItem.updateMany({ where: missing, data: { status: 'CLOSED', closedAt: now, closedByUploadId: upload.id } });
        const saved = await tx.freeStockUpload.update({ where: { id: upload.id }, data: {
          status: 'COMPLETED', totalRows: parsed.totalRows, insertedRows: plan.insertedRows,
          updatedRows: plan.updatedRows, closedRows: closed.count, completedAt: now,
        } });
        return { ...saved, validRows: parsed.rows.length, skippedRows: parsed.issues.length, protectedRows: plan.protectedIds.length };
      });
      return { message: parsed.issues.length
        ? `${parsed.rows.length} valid stock rows imported. ${parsed.issues.length} invalid rows skipped; existing matching stock and reservations were preserved.`
        : 'Complete SAP stock snapshot imported successfully.', data: result };
    } catch (error) {
      try {
        await this.prisma.freeStockUpload.update({ where: { id: upload.id }, data: { status: 'FAILED', completedAt: new Date(),
          errorMessage: (error instanceof Error ? error.message : 'Import failed.').slice(0, 5000) } });
      } catch { this.logger.error(`Could not record failure for Free Stock upload ${upload.id}.`); }
      throw error;
    }
  }

  private async upsertStock(tx: Prisma.TransactionClient, uploadId: number, rows: StockInput[]) {
    const values = rows.map((r) => Prisma.sql`(
      ${r.storageType}, ${r.storageBin}, ${r.materialCode}, ${r.plant}, ${r.storageLocation},
      ${r.availableQty}::decimal, ${r.batch}, ${r.stockQty}::decimal, ${r.certificateNo},
      ${r.grDate}::date, ${r.grNumber}, ${r.delivery}, ${r.lastMovementDate}::date,
      ${r.lastChanger}, ${uploadId}::int, NOW()
    )`);
    await tx.$executeRaw`
      INSERT INTO "FreeStockItem" (
        "storageType", "storageBin", "materialCode", "plant", "storageLocation", "availableQty",
        "batch", "stockQty", "certificateNo", "grDate", "grNumber", "delivery",
        "lastMovementDate", "lastChanger", "lastSeenUploadId", "updatedAt"
      ) VALUES ${Prisma.join(values)}
      ON CONFLICT ("storageBin", "materialCode", "batch") WHERE "status" <> 'CLOSED'
      DO UPDATE SET
        "storageType" = EXCLUDED."storageType", "storageBin" = EXCLUDED."storageBin",
        "plant" = EXCLUDED."plant", "storageLocation" = EXCLUDED."storageLocation",
        "availableQty" = EXCLUDED."availableQty", "stockQty" = EXCLUDED."stockQty",
        "certificateNo" = EXCLUDED."certificateNo", "grDate" = EXCLUDED."grDate",
        "grNumber" = EXCLUDED."grNumber", "delivery" = EXCLUDED."delivery",
        "lastMovementDate" = EXCLUDED."lastMovementDate", "lastChanger" = EXCLUDED."lastChanger",
        "lastSeenUploadId" = EXCLUDED."lastSeenUploadId", "updatedAt" = NOW()
    `;
  }

  async list(query: FreeStockQueryDto, userId: number) {
    const actor = await this.actor(userId);
    const base: Prisma.FreeStockItemWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      const contains = { contains: search, mode: 'insensitive' as const };
      base.OR = [
        { materialCode: contains }, { batch: contains }, { storageBin: contains },
        { plant: contains }, { storageLocation: contains }, { certificateNo: contains },
        { reservations: { some: { releasedAt: null, OR: [{ reservedByName: contains }, { reservedZoneName: contains }, { soNumber: contains }] } } },
      ];
    }
    // Use the same IST calendar-day boundaries as the Reserved Days displayed in rows.
    const reservationScope: Prisma.FreeStockReservationWhereInput = { releasedAt: null };
    if (query.zoneId !== undefined) reservationScope.reservedZoneId = query.zoneId;
    if (query.reservedDays && query.reservedDays !== 'ALL') {
      const today = this.istDay(new Date());
      const start = (daysAgo: number) => new Date(today - daysAgo * 86400000 - 19800000);
      reservationScope.reservedAt = query.reservedDays === '0_30'
        ? { gte: start(30), lt: start(-1) }
        : query.reservedDays === '31_90'
          ? { gte: start(90), lt: start(30) }
          : { lt: start(90) };
    }
    if (query.zoneId !== undefined || (query.reservedDays && query.reservedDays !== 'ALL')) {
      base.reservations = { some: reservationScope };
    }
    // Summaries follow search/zone/age, independently of selected status/page.
    const myReservationsWhere: Prisma.FreeStockItemWhereInput = {
      ...base, status: 'RESERVED',
      reservations: { some: { ...reservationScope, reservedById: actor.id, closedAt: null } },
    };
    if (query.mine) base.reservations = { some: { ...reservationScope, reservedById: actor.id } };
    const where: Prisma.FreeStockItemWhereInput = {
      ...base, ...(query.status && query.status !== 'ALL' ? { status: query.status as FreeStockStatus } : {}),
    };
    const { rows, total, grouped, mine, zones } = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.freeStockItem.findMany({
        where, include: STOCK_INCLUDE, orderBy: { id: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit,
      });
      const total = await tx.freeStockItem.count({ where });
      const grouped = await tx.freeStockItem.groupBy({
        by: ['status'], where: base, _count: { _all: true }, _sum: { stockQty: true },
      });
      const mine = actor.role === 'SALES' ? await tx.freeStockItem.aggregate({
        where: myReservationsWhere, _count: { _all: true }, _sum: { stockQty: true },
      }) : null;
      // Options remain stable while users change search, status, zone and age filters.
      const zones = await tx.salesZone.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
      return { rows, total, grouped, mine, zones };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    const statusCounts = { OPEN: 0, RESERVED: 0, CLOSED: 0 };
    const statusSummary = {
      ALL: { count: 0, stockQty: '0' },
      OPEN: { count: 0, stockQty: '0' },
      RESERVED: { count: 0, stockQty: '0' },
      CLOSED: { count: 0, stockQty: '0' },
    };
    let allStock = new Prisma.Decimal(0);
    for (const group of grouped) {
      const stockQty = group._sum.stockQty ?? new Prisma.Decimal(0);
      statusCounts[group.status] = group._count._all;
      statusSummary[group.status] = { count: group._count._all, stockQty: stockQty.toFixed() };
      statusSummary.ALL.count += group._count._all;
      allStock = allStock.plus(stockQty);
    }
    statusSummary.ALL.stockQty = allStock.toFixed();
    return {
      data: rows.map((row) => this.display(row, actor)), statusCounts, statusSummary,
      filterOptions: { zones },
      // Stock totals use Stock, not requested reservation quantity; decimals stay exact.
      myReservations: mine ? {
        count: mine._count._all, stockQty: (mine._sum.stockQty ?? new Prisma.Decimal(0)).toFixed(),
      } : null,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async detail(id: number, userId: number) {
    const actor = await this.actor(userId);
    const item = await this.prisma.freeStockItem.findUnique({ where: { id }, include: STOCK_INCLUDE });
    if (!item) throw new NotFoundException('Stock item not found.');
    return { data: this.display(item, actor) };
  }

  private display(item: StockRecord, actor: Actor) {
    const { reservations, ...stock } = item;
    const reservation = item.status === 'OPEN' ? null : reservations[0] ?? null;
    const today = this.istDay(new Date());
    // SALES can see shortage only for their own reservation; ADMIN sees all.
    const canViewShortage = reservation && (actor.role === 'ADMIN' || reservation.reservedById === actor.id);
    const shortage = canViewShortage ? Prisma.Decimal.max(new Prisma.Decimal(reservation.reservedQty).minus(item.stockQty), 0) : null;
    return {
      ...stock,
      availableQty: item.availableQty?.toFixed() ?? null, stockQty: item.stockQty.toFixed(),
      grDate: item.grDate?.toISOString().slice(0, 10) ?? null,
      lastMovementDate: item.lastMovementDate?.toISOString().slice(0, 10) ?? null,
      reservation: reservation ? 'Yes' : null,
      reservationId: reservation?.id ?? null,
      reservedQty: reservation?.reservedQty.toFixed() ?? null,
      soNumber: reservation?.soNumber ?? null,
      name: reservation?.reservedByName ?? null,
      zone: reservation?.reservedZoneName ?? null,
      reservedById: reservation?.reservedById ?? null,
      reservedDate: reservation?.reservedAt ?? null,
      reservedDays: reservation ? Math.max(0, Math.round((today - this.istDay(reservation.reservedAt)) / 86400000)) : null,
      ageFromGrDays: item.grDate ? Math.round((today - item.grDate.getTime()) / 86400000) : null,
      shortageQty: shortage?.toFixed() ?? null,
      hasShortage: shortage ? shortage.greaterThan(0) : false,
      canReserve: actor.role === 'SALES' && Boolean(item.storageBin) && item.status === 'OPEN' && item.stockQty.greaterThan(0),
      canRelease: item.status === 'RESERVED' && Boolean(reservation) && (actor.role === 'ADMIN' || reservation?.reservedById === actor.id),
    };
  }

  private istDay(date: Date): number {
    const shifted = new Date(date.getTime() + 19800000);
    return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  }

  async uploads(query: FreeStockPageDto, userId: number) {
    await this.actor(userId, ['ADMIN']);
    const where: Prisma.FreeStockUploadWhereInput = query.search?.trim()
      ? { fileName: { contains: query.search.trim(), mode: 'insensitive' } } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.freeStockUpload.findMany({ where, orderBy: { id: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.freeStockUpload.count({ where }),
    ]);
    return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async uploadDetail(id: number, userId: number) {
    await this.actor(userId, ['ADMIN']);
    const data = await this.prisma.freeStockUpload.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('Stock upload not found.');
    return { data };
  }

  async history(id: number, query: FreeStockPageDto, userId: number) {
    const actor = await this.actor(userId);
    if (!await this.prisma.freeStockItem.findUnique({ where: { id }, select: { id: true } })) {
      throw new NotFoundException('Stock item not found.');
    }
    const where: Prisma.FreeStockReservationWhereInput = { stockItemId: id, ...(actor.role === 'ADMIN' ? {} : { reservedById: actor.id }) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.freeStockReservation.findMany({ where, orderBy: { id: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.freeStockReservation.count({ where }),
    ]);
    return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async reservationFile(path: string, userId: number, commit: boolean, fileName: string) {
    const actor = await this.actor(userId, ['SALES']);
    const lines = await parseReservationFile(path);
    return this.processReservation(actor, lines, commit, fileName);
  }

  async reserve(dto: ReserveFreeStockDto, userId: number) {
    const actor = await this.actor(userId, ['SALES']);
    return this.processReservation(actor, normalizeReservationLines(dto.lines), true, null);
  }

  private async processReservation(actor: Actor, lines: ReservationInput[], commit: boolean, sourceFileName: string | null) {
    if (!actor.salesZone) throw new BadRequestException('Your account must have a Sales Zone before reserving stock.');
    return this.locked(async (tx) => {
      const items = await tx.freeStockItem.findMany({ where: { status: { not: 'CLOSED' } }, include: STOCK_INCLUDE });
      const map = new Map(items.map((item) => [stockKey(item.storageBin, item.materialCode, item.batch), item]));
      const errors: { rowNo: number; materialCode: string; batch: string; message: string }[] = [];
      const selected: { line: ReservationInput; item: StockRecord }[] = [];
      for (const line of lines) {
        const item = map.get(stockKey(line.storageBin, line.materialCode, line.batch));
        let message = '';
        if (!item) message = 'Storage Bin + Material + Batch is missing or CLOSED.';
        else if (item.status !== 'OPEN' || item.reservations.length) message = 'The complete stock row is already reserved.';
        else if (item.stockQty.lessThan(line.qty)) message = 'Requested quantity exceeds current Stock (column H).';
        if (message) errors.push({ rowNo: line.rowNo, materialCode: line.materialCode, batch: line.batch, message });
        else selected.push({ line, item: item! });
      }
      if (errors.length) throw new ConflictException({ code: 'FREE_STOCK_RESERVATION_REJECTED', message: 'The entire reservation was rejected. Nothing was reserved.', errors: errors.slice(0, 100), totalErrors: errors.length });
      if (!commit) return {
        message: 'All requested rows are currently available. Preview does not lock stock.',
        data: { totalRows: selected.length, lines: selected.map(({ line, item }) => ({ ...line, stockItemId: item.id, stockQty: item.stockQty.toFixed() })) },
      };
      const now = new Date();
      const bulkReservationId = randomUUID();
      for (let offset = 0; offset < selected.length; offset += 500) {
        const chunk = selected.slice(offset, offset + 500);
        await tx.freeStockReservation.createMany({
          data: chunk.map(({ item, line }) => ({
            bulkReservationId, stockItemId: item.id, reservedQty: new Prisma.Decimal(line.qty),
            soNumber: line.soNumber, reservedById: actor.id, reservedByName: actor.name,
            reservedZoneId: actor.salesZone!.id, reservedZoneName: actor.salesZone!.name,
            reservedAt: now, sourceFileName,
          })),
        });
        const changed = await tx.freeStockItem.updateMany({
          where: { id: { in: chunk.map(({ item }) => item.id) }, status: 'OPEN' }, data: { status: 'RESERVED' },
        });
        if (changed.count !== chunk.length) throw new ConflictException('Stock changed. The entire reservation was rolled back.');
      }
      return { message: 'All requested stock rows reserved successfully.', data: { bulkReservationId, reservedRows: selected.length, reservedAt: now } };
    });
  }

  /** New opt-in flow: the original all-or-nothing reservation endpoints stay unchanged. */
  async previewBulkReservation(path: string, userId: number, sourceFileName: string) {
    const actor = await this.actor(userId, ['SALES']);
    if (!actor.salesZone) throw new BadRequestException('Your account must have a Sales Zone before reserving stock.');
    const lines = await parseReservationFile(path);
    return this.locked(async (tx) => {
      const preview = await this.bulkAllocation(tx, lines);
      return { message: 'Review the proposed allocations. Nothing has been reserved.', data: {
        ...preview.data, sourceFileName,
        previewToken: this.signBulkPreview(actor.id, preview.fingerprint),
      } };
    });
  }

  async previewSelectedReservation(dto: ReserveFreeStockDto, userId: number) {
    const actor = await this.actor(userId, ['SALES']);
    if (!actor.salesZone) throw new BadRequestException('Your account must have a Sales Zone before reserving stock.');
    const lines = normalizeReservationLines(dto.lines);
    return this.locked(async (tx) => {
      const preview = await this.bulkAllocation(tx, lines);
      return { message: 'Review the proposed allocations. Nothing has been reserved.', data: {
        ...preview.data, previewToken: this.signBulkPreview(actor.id, preview.fingerprint),
      } };
    });
  }

  async confirmSelectedReservation(dto: ConfirmSelectedFreeStockDto, userId: number) {
    const actor = await this.actor(userId, ['SALES']);
    if (!actor.salesZone) throw new BadRequestException('Your account must have a Sales Zone before reserving stock.');
    const lines = normalizeReservationLines(dto.lines);
    const approved = this.approvedBulkFingerprint(dto.previewToken, actor.id);
    return this.confirmAllocation(actor, lines, approved, null);
  }

  private async bulkAllocation(tx: Prisma.TransactionClient, lines: ReservationInput[]) {
    // Read active occurrences only. Exact Storage Bin+Material+Batch keys prevent substitutions.
    const items = await tx.freeStockItem.findMany({ where: { status: { not: 'CLOSED' } }, include: STOCK_INCLUDE });
    const lookup = new Map(items.map((item) => [stockKey(item.storageBin, item.materialCode, item.batch), item]));
    let requestedQty = new Prisma.Decimal(0), allocatedQty = new Prisma.Decimal(0);
    const counts = { allocated: 0, partial: 0, notAllocated: 0 };
    const allocation = lines.map((line) => {
      const item = lookup.get(stockKey(line.storageBin, line.materialCode, line.batch));
      const requested = new Prisma.Decimal(line.qty);
      const stock = item?.stockQty ?? new Prisma.Decimal(0);
      const eligible = item?.status === 'OPEN' && !item.reservations.length && stock.greaterThan(0);
      const allocated = eligible ? Prisma.Decimal.min(requested, stock) : new Prisma.Decimal(0);
      const pending = requested.minus(allocated);
      const status = allocated.equals(0) ? 'NOT_ALLOCATED' : pending.greaterThan(0) ? 'PARTIAL' : 'ALLOCATED';
      if (status === 'ALLOCATED') counts.allocated++;
      else if (status === 'PARTIAL') counts.partial++;
      else counts.notAllocated++;
      requestedQty = requestedQty.plus(requested);
      allocatedQty = allocatedQty.plus(allocated);
      const remarks = !item ? 'Storage Bin, Material and Batch are missing or CLOSED.'
        : item.status !== 'OPEN' || item.reservations.length ? 'This Storage Bin, Material and Batch are already reserved.'
        : !stock.greaterThan(0) ? 'No stock is available for this Storage Bin, Material and Batch.'
        : status === 'PARTIAL' ? 'Only part of the requested quantity is available.' : 'Requested quantity is available.';
      return { ...line, stockItemId: item?.id ?? null, stockQty: stock.toFixed(),
        allocatedQty: allocated.toFixed(), pendingQty: pending.toFixed(), status, remarks,
        // Include version and current reservation IDs in the approval fingerprint.
        version: item ? [item.updatedAt.toISOString(), item.status, ...item.reservations.map((reservation) => reservation.id)] : null,
      };
    });
    const fingerprint = createHash('sha256').update(JSON.stringify(allocation)).digest('hex');
    return { fingerprint, data: {
      totalRows: lines.length,
      lines: allocation.map(({ version, ...line }) => line),
      summary: { ...counts, requestedQty: requestedQty.toFixed(), allocatedQty: allocatedQty.toFixed(),
        pendingQty: requestedQty.minus(allocatedQty).toFixed() },
      canConfirm: allocatedQty.greaterThan(0),
    } };
  }

  private bulkPreviewKey(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required for bulk reservation previews.');
    return secret;
  }

  private signBulkPreview(actorId: number, fingerprint: string): string {
    const payload = Buffer.from(JSON.stringify({ actorId, fingerprint, expiresAt: Date.now() + 15 * 60 * 1000 })).toString('base64url');
    const signature = createHmac('sha256', this.bulkPreviewKey()).update('free-stock-bulk:' + payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  private approvedBulkFingerprint(token: string, actorId: number): string {
    const invalid = () => new ConflictException({ code: 'FREE_STOCK_BULK_PREVIEW_EXPIRED',
      message: 'This preview is invalid or has expired. Preview the file again before confirming.' });
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) throw invalid();
    const expected = createHmac('sha256', this.bulkPreviewKey()).update('free-stock-bulk:' + payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw invalid();
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (data.actorId !== actorId || typeof data.expiresAt !== 'number' || data.expiresAt <= Date.now()
        || typeof data.fingerprint !== 'string') throw invalid();
      return data.fingerprint;
    } catch { throw invalid(); }
  }

  async confirmBulkReservation(path: string, previewToken: string, userId: number, sourceFileName: string) {
    const actor = await this.actor(userId, ['SALES']);
    if (!actor.salesZone) throw new BadRequestException('Your account must have a Sales Zone before reserving stock.');
    const approved = this.approvedBulkFingerprint(previewToken, actor.id);
    const lines = await parseReservationFile(path);
    return this.confirmAllocation(actor, lines, approved, sourceFileName);
  }

  /** Both Excel and selected-row confirmations share the same atomic allocator. */
  private async confirmAllocation(actor: Actor, lines: ReservationInput[], approved: string, sourceFileName: string | null) {
    return this.locked(async (tx) => {
      const preview = await this.bulkAllocation(tx, lines);
      if (preview.fingerprint !== approved) throw new ConflictException({ code: 'FREE_STOCK_BULK_PREVIEW_CHANGED',
        message: 'Stock or reservations changed since preview. Nothing was reserved. Preview the file again.' });
      const selected = preview.data.lines.filter((line) => new Prisma.Decimal(line.allocatedQty).greaterThan(0));
      if (!selected.length) throw new ConflictException('No requested stock is available. Nothing was reserved.');
      const bulkReservationId = randomUUID(), reservedAt = new Date();
      for (let offset = 0; offset < selected.length; offset += 500) {
        const chunk = selected.slice(offset, offset + 500);
        await tx.freeStockReservation.createMany({ data: chunk.map((line) => ({
          bulkReservationId, stockItemId: line.stockItemId!, reservedQty: new Prisma.Decimal(line.allocatedQty),
          soNumber: line.soNumber, reservedById: actor.id, reservedByName: actor.name,
          reservedZoneId: actor.salesZone!.id, reservedZoneName: actor.salesZone!.name,
          reservedAt, sourceFileName,
        })) });
        const changed = await tx.freeStockItem.updateMany({
          where: { id: { in: chunk.map((line) => line.stockItemId!) }, status: 'OPEN' }, data: { status: 'RESERVED' },
        });
        if (changed.count !== chunk.length) throw new ConflictException('Stock changed. The entire confirmation was rolled back. Preview again.');
      }
      return { message: 'Available allocations reserved successfully. Review any pending quantities below.',
        data: { ...preview.data, bulkReservationId, reservedAt, reservedRows: selected.length, canConfirm: false } };
    });
  }

  async release(ids: number[], userId: number) {
    const actor = await this.actor(userId);
    return this.locked(async (tx) => {
      const items = await tx.freeStockItem.findMany({ where: { id: { in: ids } }, include: STOCK_INCLUDE });
      const map = new Map(items.map((item) => [item.id, item]));
      const errors = ids.flatMap((id) => {
        const item = map.get(id);
        const reservation = item?.reservations[0];
        if (!item || item.status !== 'RESERVED' || !reservation || reservation.closedAt) return [{ stockItemId: id, message: 'Item is not actively RESERVED.' }];
        if (actor.role !== 'ADMIN' && reservation.reservedById !== actor.id) return [{ stockItemId: id, message: 'Only the owner or ADMIN can release this reservation.' }];
        return [];
      });
      if (errors.length) throw new ConflictException({ code: 'FREE_STOCK_RELEASE_REJECTED', message: 'Nothing was released.', errors });
      const now = new Date();
      await tx.freeStockReservation.updateMany({
        where: { stockItemId: { in: ids }, releasedAt: null, closedAt: null },
        data: { releasedAt: now, releasedById: actor.id, releasedByName: actor.name },
      });
      const changed = await tx.freeStockItem.updateMany({ where: { id: { in: ids }, status: 'RESERVED' }, data: { status: 'OPEN' } });
      if (changed.count !== ids.length) throw new ConflictException('Stock changed. The entire release was rolled back.');
      return { message: 'Reservations released successfully.', data: { releasedRows: changed.count } };
    });
  }

  async template(userId: number): Promise<Buffer> {
    await this.actor(userId, ['ADMIN', 'SALES']);
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Reservations');
    sheet.columns = [
      { header: 'Storage Bin', key: 'storageBin', width: 24 },
      { header: 'Material', key: 'material', width: 28 }, { header: 'Batch', key: 'batch', width: 24 },
      { header: 'Qty', key: 'qty', width: 14 }, { header: 'SO Number', key: 'so', width: 24 },
    ];
    for (const column of [1, 2, 3, 5]) sheet.getColumn(column).numFmt = '@';
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return Buffer.from(await book.xlsx.writeBuffer());
  }
}
