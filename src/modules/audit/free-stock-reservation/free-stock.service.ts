import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  Logger, NotFoundException,
} from '@nestjs/common';
import { FreeStockStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../prisma.service';
import { FreeStockPageDto, FreeStockQueryDto, ReserveFreeStockDto } from './free-stock.dto';
import {
  normalizeReservationLines, parseReservationFile, parseStockFile,
  ReservationInput, StockInput, stockKey,
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

  async previewStock(path: string, userId: number) {
    await this.actor(userId, ['ADMIN']);
    const rows = await parseStockFile(path);
    const keys = new Set(rows.map((r) => stockKey(r.materialCode, r.batch)));
    const existing = await this.prisma.freeStockItem.findMany({
      where: { status: { not: 'CLOSED' } },
      select: { materialCode: true, batch: true },
    });
    const known = new Set(existing.map((r) => stockKey(r.materialCode, r.batch)));
    const updatedRows = rows.filter((r) => known.has(stockKey(r.materialCode, r.batch))).length;
    return {
      message: 'Stock preview only. No data was changed.',
      data: {
        totalRows: rows.length, insertedRows: rows.length - updatedRows, updatedRows,
        wouldCloseRows: existing.filter((r) => !keys.has(stockKey(r.materialCode, r.batch))).length,
        sample: rows.slice(0, 25),
        requiresFullSnapshot: true,
      },
    };
  }

  async uploadStock(path: string, fileName: string, userId: number) {
    const actor = await this.actor(userId, ['ADMIN']);
    const upload = await this.prisma.freeStockUpload.create({
      data: { fileName, uploadedById: actor.id, uploadedByName: actor.name },
    });
    try {
      const rows = await parseStockFile(path);
      const result = await this.locked(async (tx) => {
        const live = await tx.freeStockItem.findMany({
          where: { status: { not: 'CLOSED' } }, select: { materialCode: true, batch: true },
        });
        const known = new Set(live.map((r) => stockKey(r.materialCode, r.batch)));
        const insertedRows = rows.filter((r) => !known.has(stockKey(r.materialCode, r.batch))).length;
        for (let offset = 0; offset < rows.length; offset += 500) {
          await this.upsertStock(tx, upload.id, rows.slice(offset, offset + 500));
        }
        const missing: Prisma.FreeStockItemWhereInput = { status: { not: 'CLOSED' }, lastSeenUploadId: { not: upload.id } };
        const now = new Date();
        await tx.freeStockReservation.updateMany({
          where: { releasedAt: null, closedAt: null, stockItem: { is: missing } },
          data: { closedAt: now },
        });
        const closed = await tx.freeStockItem.updateMany({
          where: missing, data: { status: 'CLOSED', closedAt: now, closedByUploadId: upload.id },
        });
        return tx.freeStockUpload.update({
          where: { id: upload.id },
          data: {
            status: 'COMPLETED', totalRows: rows.length, insertedRows,
            updatedRows: rows.length - insertedRows, closedRows: closed.count, completedAt: now,
          },
        });
      });
      return { message: 'Complete SAP stock snapshot imported successfully.', data: result };
    } catch (error) {
      try {
        await this.prisma.freeStockUpload.update({
          where: { id: upload.id },
          data: { status: 'FAILED', completedAt: new Date(), errorMessage: (error instanceof Error ? error.message : 'Import failed.').slice(0, 5000) },
        });
      } catch {
        this.logger.error(`Could not record failure for Free Stock upload ${upload.id}.`);
      }
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
      ON CONFLICT ("materialCode", "batch") WHERE "status" <> 'CLOSED'
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
    // Card summaries follow search, independently of the selected status/page.
    const myReservationsWhere: Prisma.FreeStockItemWhereInput = {
      ...base, status: 'RESERVED',
      reservations: { some: { reservedById: actor.id, releasedAt: null, closedAt: null } },
    };
    if (query.mine) base.reservations = { some: { reservedById: actor.id, releasedAt: null } };
    const where: Prisma.FreeStockItemWhereInput = {
      ...base, ...(query.status && query.status !== 'ALL' ? { status: query.status as FreeStockStatus } : {}),
    };
    const { rows, total, grouped, mine } = await this.prisma.$transaction(async (tx) => {
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
      return { rows, total, grouped, mine };
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
    const shortage = reservation ? Prisma.Decimal.max(new Prisma.Decimal(reservation.reservedQty).minus(item.stockQty), 0) : null;
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
      ageFromGrDays: reservation && item.grDate ? Math.round((today - item.grDate.getTime()) / 86400000) : null,
      shortageQty: shortage?.toFixed() ?? null,
      hasShortage: shortage ? shortage.greaterThan(0) : false,
      canReserve: actor.role === 'SALES' && item.status === 'OPEN' && item.stockQty.greaterThan(0),
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
      const map = new Map(items.map((item) => [stockKey(item.materialCode, item.batch), item]));
      const errors: { rowNo: number; materialCode: string; batch: string; message: string }[] = [];
      const selected: { line: ReservationInput; item: StockRecord }[] = [];
      for (const line of lines) {
        const item = map.get(stockKey(line.materialCode, line.batch));
        let message = '';
        if (!item) message = 'Material + Batch is missing or CLOSED.';
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
      { header: 'Material', key: 'material', width: 28 }, { header: 'Batch', key: 'batch', width: 24 },
      { header: 'Qty', key: 'qty', width: 14 }, { header: 'SO Number', key: 'so', width: 24 },
    ];
    sheet.getColumn(1).numFmt = '@'; sheet.getColumn(2).numFmt = '@'; sheet.getColumn(4).numFmt = '@';
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return Buffer.from(await book.xlsx.writeBuffer());
  }
}
