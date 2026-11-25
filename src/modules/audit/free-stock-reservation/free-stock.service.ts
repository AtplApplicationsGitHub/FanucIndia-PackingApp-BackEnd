import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FreeStockStatus, Prisma } from '@prisma/client';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import * as ExcelJS from 'exceljs';
import { createReadStream } from 'fs';
import { PrismaService } from '../../../prisma.service';
import type {
  ConfirmSelectedFreeStockDto,
  FreeStockPageDto,
  FreeStockQueryDto,
  ReserveFreeStockDto,
} from './free-stock.dto';
import {
  normalizeReservationLines,
  parseReservationFile,
  parseStockFile,
  type ReservationInput,
} from './free-stock-excel';
import { FreeStockColumnConfigService } from './free-stock-column-config.service';
import { planStockSnapshot } from './free-stock-snapshot';
import { allocateClosestStock } from './free-stock-allocation';

import { FreeStockPreviewActivityService } from './free-stock-preview-activity.service';

const STOCK_INCLUDE = {
  reservations: {
    where: { releasedAt: null },
    orderBy: { id: 'desc' },
    take: 1,
  },
} satisfies Prisma.FreeStockItemInclude;

type StockRecord = Prisma.FreeStockItemGetPayload<{
  include: typeof STOCK_INCLUDE;
}>;
type Actor = Prisma.UserGetPayload<{ include: { salesZone: true } }>;

@Injectable()
export class FreeStockService {
  private readonly logger = new Logger(FreeStockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly columnConfig: FreeStockColumnConfigService,
    private readonly previewActivity: FreeStockPreviewActivityService,
  ) {}

  private async actor(
    userId: number,
    roles = ['ADMIN', 'SALES'],
  ): Promise<Actor> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { salesZone: true },
    });
    if (!user || !roles.includes(user.role))
      throw new ForbiddenException(
        'This action is not permitted for your account.',
      );
    return user;
  }

  private async locked<T>(
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(74020005::bigint)::text`;
        return action(tx);
      },
      { maxWait: 10000, timeout: 180000 },
    );
  }

  private async stockFileHash(path: string): Promise<string> {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest('hex');
  }

  private signStockPreview(actorId: number, fileHash: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        actorId,
        fileHash,
        expiresAt: Date.now() + 30 * 60 * 1000,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', this.bulkPreviewKey())
      .update('free-stock-snapshot:' + payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private checkStockPreview(
    token: string | undefined,
    actorId: number,
    fileHash: string,
  ) {
    const invalid = () =>
      new ConflictException(
        'The stock preview has changed or expired. Review the file again before importing.',
      );
    if (!token) throw invalid();
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) throw invalid();
    const expected = createHmac('sha256', this.bulkPreviewKey())
      .update('free-stock-snapshot:' + payload)
      .digest();
    const received = Buffer.from(signature, 'base64url');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      throw invalid();
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (
        data.actorId !== actorId ||
        data.fileHash !== fileHash ||
        typeof data.expiresAt !== 'number' ||
        data.expiresAt <= Date.now()
      )
        throw invalid();
    } catch {
      throw invalid();
    }
  }

  async previewStock(path: string, userId: number) {
    const actor = await this.actor(userId, ['ADMIN']);
    const [parsed, fileHash] = await Promise.all([
      this.readStock(path),
      this.stockFileHash(path),
    ]);
    const existing = await this.prisma.freeStockItem.findMany({
      where: { status: { not: 'CLOSED' } },
      orderBy: { id: 'asc' },
    });
    const plan = planStockSnapshot(parsed, existing);
    return {
      message: 'Stock preview only. No data was changed.',
      data: {
        totalRows: parsed.totalRows,
        validRows: parsed.rows.length,
        skippedRows: parsed.issues.length,
        insertedRows: plan.insertedRows,
        updatedRows: plan.updatedRows,
        wouldCloseRows: 0,
        protectedRows: plan.protectedIds.length,
        issues: parsed.issues,
        sample: parsed.rows.slice(0, 25),
        requiresFullSnapshot: true,
        canImport: parsed.rows.length > 0,
        previewToken: this.signStockPreview(
          actor.id,
          this.stockPreviewHash(fileHash, parsed),
        ),
      },
    };
  }

  async uploadStock(
    path: string,
    fileName: string,
    userId: number,
    options: { skipInvalidRows?: boolean; previewToken?: string } = {},
  ) {
    const actor = await this.actor(userId, ['ADMIN']);
    const [parsed, fileHash] = await Promise.all([
      this.readStock(path),
      this.stockFileHash(path),
    ]);
    this.checkStockPreview(
      options.previewToken,
      actor.id,
      this.stockPreviewHash(fileHash, parsed),
    );
    if (!parsed.rows.length)
      throw new BadRequestException(
        'No valid stock rows are available to import. Nothing was saved.',
      );
    if (parsed.issues.length && !options.skipInvalidRows) {
      throw new BadRequestException(
        'The file contains invalid rows. Review them and choose Upload valid rows only, or cancel. Nothing was saved.',
      );
    }
    const upload = await this.prisma.freeStockUpload.create({
      data: { fileName, uploadedById: actor.id, uploadedByName: actor.name },
    });
    try {
      const result = await this.locked(async (tx) => {
        const live = await tx.freeStockItem.findMany({
          where: { status: { not: 'CLOSED' } },
          orderBy: { id: 'asc' },
        });
        const plan = planStockSnapshot(parsed, live);
        for (let offset = 0; offset < parsed.rows.length; offset += 500) {
          await this.saveStockOccurrences(
            tx,
            upload.id,
            plan.rows.slice(offset, offset + 500),
          );
        }
        // Invalid source rows are present in SAP: mark their existing records as seen,
        // preserving stock values, status, ownership and the original reservation.
        // Incomplete identities protect every potentially matching existing row.
        for (let offset = 0; offset < plan.protectedIds.length; offset += 500) {
          await tx.freeStockItem.updateMany({
            where: {
              id: { in: plan.protectedIds.slice(offset, offset + 500) },
              status: { not: 'CLOSED' },
            },
            data: { lastSeenUploadId: upload.id },
          });
        }
        const now = new Date();
        // Uploads may omit existing stock. Keep both the stock and its reservation active.
        // const missing: Prisma.FreeStockItemWhereInput = {
        //   status: { not: 'CLOSED' },
        //   lastSeenUploadId: { not: upload.id },
        // };
        // await tx.freeStockReservation.updateMany({
        //   where: {
        //     releasedAt: null,
        //     closedAt: null,
        //     stockItem: { is: missing },
        //   },
        //   data: { closedAt: now },
        // });
        // const closed = await tx.freeStockItem.updateMany({
        //   where: missing,
        //   data: {
        //     status: 'CLOSED',
        //     closedAt: now,
        //     closedByUploadId: upload.id,
        //   },
        // });
        const saved = await tx.freeStockUpload.update({
          where: { id: upload.id },
          data: {
            status: 'COMPLETED',
            totalRows: parsed.totalRows,
            insertedRows: plan.insertedRows,
            updatedRows: plan.updatedRows,
            closedRows: 0,
            completedAt: now,
          },
        });
        return {
          ...saved,
          validRows: parsed.rows.length,
          skippedRows: parsed.issues.length,
          protectedRows: plan.protectedIds.length,
        };
      });
      return {
        message: parsed.issues.length
          ? `${parsed.rows.length} valid stock rows imported. ${parsed.issues.length} invalid rows skipped; existing matching stock and reservations were preserved.`
          : 'SAP stock file imported successfully.',
        data: result,
      };
    } catch (error) {
      try {
        await this.prisma.freeStockUpload.update({
          where: { id: upload.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: (error instanceof Error
              ? error.message
              : 'Import failed.'
            ).slice(0, 5000),
          },
        });
      } catch {
        this.logger.error(
          `Could not record failure for Free Stock upload ${upload.id}.`,
        );
      }
      throw error;
    }
  }

  private async readStock(path: string) {
    return parseStockFile(path, await this.columnConfig.stock());
  }

  private stockPreviewHash(fileHash: string, parsed: unknown) {
    return createHash('sha256')
      .update(fileHash)
      .update(JSON.stringify(parsed))
      .digest('hex');
  }

  private async readReservations(path: string) {
    return parseReservationFile(path, await this.columnConfig.reservations());
  }

  private async saveStockOccurrences(
    tx: Prisma.TransactionClient,
    uploadId: number,
    rows: ReturnType<typeof planStockSnapshot>['rows'],
  ) {
    const inserted = rows.filter((entry) => entry.id === null);
    if (inserted.length)
      await tx.freeStockItem.createMany({
        data: inserted.map(({ row }) => ({
          ...row,
          lastSeenUploadId: uploadId,
        })),
      });
    const updated = rows.filter((entry) => entry.id !== null);
    if (!updated.length) return;
    await tx.$executeRaw`
      UPDATE "FreeStockItem" AS item
      SET "storageType"=v."storageType", "storageBin"=v."storageBin", "materialCode"=v."materialCode",
          "plant"=v."plant", "storageLocation"=v."storageLocation", "availableQty"=v."availableQty",
          "batch"=v."batch", "stockQty"=v."stockQty", "certificateNo"=v."certificateNo",
          "grDate"=v."grDate", "grNumber"=v."grNumber", "delivery"=v."delivery",
          "lastMovementDate"=v."lastMovementDate", "lastChanger"=v."lastChanger",
          "lastSeenUploadId"=${uploadId}::int, "updatedAt"=NOW()
      FROM (VALUES ${Prisma.join(
        updated.map(
          ({ id, row: r }) => Prisma.sql`(
        ${id}::int, ${r.storageType}::varchar, ${r.storageBin}::varchar, ${r.materialCode}::varchar,
        ${r.plant}::varchar, ${r.storageLocation}::varchar, ${r.availableQty}::decimal,
        ${r.batch}::varchar, ${r.stockQty}::decimal, ${r.certificateNo}::varchar,
        ${r.grDate}::date, ${r.grNumber}::varchar, ${r.delivery}::varchar,
        ${r.lastMovementDate}::date, ${r.lastChanger}::varchar
      )`,
        ),
      )}) AS v("id","storageType","storageBin","materialCode","plant","storageLocation","availableQty",
        "batch","stockQty","certificateNo","grDate","grNumber","delivery","lastMovementDate","lastChanger")
      WHERE item."id"=v."id" AND item."status" <> 'CLOSED'`;
  }

  async list(query: FreeStockQueryDto, userId: number) {
    const actor = await this.actor(userId);
    const base: Prisma.FreeStockItemWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      const contains = { contains: search, mode: 'insensitive' as const };
      base.OR = [
        { materialCode: contains },
        { batch: contains },
        { storageBin: contains },
        { plant: contains },
        { storageLocation: contains },
        { certificateNo: contains },
        {
          reservations: {
            some: {
              releasedAt: null,
              OR: [
                { reservedByName: contains },
                { reservedZoneName: contains },
                { soNumber: contains },
              ],
            },
          },
        },
      ];
    }
    // Use the same IST calendar-day boundaries as the Reserved Days displayed in rows.
    const reservationScope: Prisma.FreeStockReservationWhereInput = {
      releasedAt: null,
    };
    if (query.zoneId !== undefined)
      reservationScope.reservedZoneId = query.zoneId;
    if (query.reservedDays && query.reservedDays !== 'ALL') {
      const today = this.istDay(new Date());
      const start = (daysAgo: number) =>
        new Date(today - daysAgo * 86400000 - 19800000);
      reservationScope.reservedAt =
        query.reservedDays === '0_30'
          ? { gte: start(30), lt: start(-1) }
          : query.reservedDays === '31_90'
            ? { gte: start(90), lt: start(30) }
            : { lt: start(90) };
    }
    if (
      query.zoneId !== undefined ||
      (query.reservedDays && query.reservedDays !== 'ALL')
    ) {
      base.reservations = { some: reservationScope };
    }
    // Summaries follow search/zone/age, independently of selected status/page.
    const myReservationsWhere: Prisma.FreeStockItemWhereInput = {
      ...base,
      status: 'RESERVED',
      reservations: {
        some: { ...reservationScope, reservedById: actor.id, closedAt: null },
      },
    };
    const where: Prisma.FreeStockItemWhereInput = query.mine
      ? myReservationsWhere
      : {
          ...base,
          ...(query.status && query.status !== 'ALL'
            ? { status: query.status as FreeStockStatus }
            : {}),
        };
    const groupBySo = query.status === 'RESERVED' || query.mine === true;
    const { rows, total, grouped, mine, zones, reservationGroups } =
      await this.prisma.$transaction(
        async (tx) => {
          let rows: StockRecord[] = [];
          let total: number;
          let reservationGroups: { soNumber: string | null }[] | null = null;

          if (groupBySo) {
            const reservationWhere: Prisma.FreeStockReservationWhereInput = {
              ...reservationScope,
              closedAt: null,
              ...(query.mine ? { reservedById: actor.id } : {}),
              stockItem: { is: where },
            };

            // Count individual reserved stock rows, not SO groups.
            total = await tx.freeStockReservation.count({
              where: reservationWhere,
            });

            // Fetch only the requested number of reserved rows.
            const pageReservations = await tx.freeStockReservation.findMany({
              where: reservationWhere,
              orderBy: [{ soNumber: 'asc' }, { id: 'asc' }],
              skip: (query.page - 1) * query.limit,
              take: query.limit,
              select: {
                stockItemId: true,
                soNumber: true,
              },
            });

            // Fetch complete stock details for those rows.
            const ids = pageReservations.map((r) => r.stockItemId);

            if (ids.length) {
              const found = await tx.freeStockItem.findMany({
                where: { id: { in: ids } },
                include: STOCK_INCLUDE,
              });

              const byId = new Map(found.map((row) => [row.id, row]));

              rows = ids
                .map((id) => byId.get(id))
                .filter((row): row is StockRecord => row !== undefined);
            }

            // Preserve SO grouping for the frontend.
            reservationGroups = [
              ...new Set(pageReservations.map((r) => r.soNumber)),
            ].map((soNumber) => ({ soNumber }));
          } else {
            rows = await tx.freeStockItem.findMany({
              where,
              include: STOCK_INCLUDE,
              orderBy: { id: 'asc' },
              skip: (query.page - 1) * query.limit,
              take: query.limit,
            });
            total = await tx.freeStockItem.count({ where });
          }
          const grouped = await tx.freeStockItem.groupBy({
            by: ['status'],
            where: base,
            _count: { _all: true },
            _sum: { stockQty: true },
          });
          const mine =
            actor.role === 'SALES'
              ? await tx.freeStockItem.aggregate({
                  where: myReservationsWhere,
                  _count: { _all: true },
                  _sum: { stockQty: true },
                })
              : null;
          // Options remain stable while users change search, status, zone and age filters.
          const zones = await tx.salesZone.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          });
          return { rows, total, grouped, mine, zones, reservationGroups };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
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
      statusSummary[group.status] = {
        count: group._count._all,
        stockQty: stockQty.toFixed(),
      };
      statusSummary.ALL.count += group._count._all;
      allStock = allStock.plus(stockQty);
    }
    statusSummary.ALL.stockQty = allStock.toFixed();
    return {
      data: reservationGroups
        ? reservationGroups.map((group) => {
            const items = rows.filter(
              (row) =>
                (row.reservations[0]?.soNumber ?? null) === group.soNumber,
            );
            return {
              soNumber: group.soNumber,
              rowCount: items.length,
              stockQty: items
                .reduce(
                  (sum, item) => sum.plus(item.stockQty),
                  new Prisma.Decimal(0),
                )
                .toFixed(),
              reservedQty: items
                .reduce(
                  (sum, item) =>
                    sum.plus(item.reservations[0]?.reservedQty ?? 0),
                  new Prisma.Decimal(0),
                )
                .toFixed(),
              items: items.map((item) => this.display(item, actor)),
            };
          })
        : rows.map((row) => this.display(row, actor)),
      groupedBy: groupBySo ? 'SO_NUMBER' : null,
      paginationUnit: 'STOCK_ROW',
      statusCounts,
      statusSummary,
      filterOptions: { zones },
      // Stock totals use Stock, not requested reservation quantity; decimals stay exact.
      myReservations: mine
        ? {
            count: mine._count._all,
            stockQty: (mine._sum.stockQty ?? new Prisma.Decimal(0)).toFixed(),
          }
        : null,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async distinctSo(query: FreeStockPageDto, userId: number) {
    const actor = await this.actor(userId);
    const search = query.search?.trim();
    const where: Prisma.FreeStockReservationWhereInput = {
      // Only active reservations
      releasedAt: null,
      closedAt: null,
      soNumber: {
        not: null,
        notIn: [''],
        ...(search ? { contains: search, mode: 'insensitive' as const } : {}),
      },
      stockItem: {
        is: {
          status: 'RESERVED',
        },
      },
      ...(actor.role === 'SALES' ? { reservedById: actor.id } : {}),
    };

    // Group all matching reservations by SO Number.
    const groups = await this.prisma.freeStockReservation.groupBy({
      by: ['soNumber'],
      where,
      _count: {
        _all: true,
      },
      _sum: {
        reservedQty: true,
      },
      orderBy: {
        soNumber: 'asc',
      },
    });

    // Each group represents one unique SO Number.
    const total = groups.length;

    const start = (query.page - 1) * query.limit;
    const pageGroups = groups.slice(start, start + query.limit);

    return {
      distinctSoCount: total,

      data: pageGroups.map((group) => ({
        soNumber: group.soNumber,
        rowCount: group._count._all,
        reservedQty: (
          group._sum.reservedQty ?? new Prisma.Decimal(0)
        ).toFixed(),
      })),

      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async exportSo(soNumber: string, userId: number): Promise<Buffer> {
    const actor = await this.actor(userId);
    const so = soNumber?.trim();
    if (!so) throw new BadRequestException('SO Number is required.');

    const reservations = await this.prisma.freeStockReservation.findMany({
      where: {
        soNumber: so,
        releasedAt: null,
        closedAt: null,
        stockItem: { is: { status: 'RESERVED' } },
        ...(actor.role === 'SALES' ? { reservedById: actor.id } : {}),
      },
      select: { stockItemId: true },
    });
    const ids = [...new Set(reservations.map((r) => r.stockItemId))];
    if (!ids.length)
      throw new NotFoundException('No active rows found for this SO Number.');

    const items = await this.prisma.freeStockItem.findMany({
      where: { id: { in: ids } },
      include: STOCK_INCLUDE,
      orderBy: { id: 'asc' },
    });
    const rows = items
      .map((i) => this.display(i, actor))
      .filter(
        (r) =>
          r.soNumber === so &&
          (actor.role === 'ADMIN' || r.reservedById === actor.id),
      );

    const ist = (d: Date | null) =>
      d
        ? new Date(d.getTime() + 19800000)
            .toISOString()
            .replace('T', ' ')
            .slice(0, 16)
        : '';
    const num = (v: string | null) =>
      v === null || v === undefined ? '' : Number(v);

    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Free Stock');
    sheet.columns = [
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Typ', key: 'storageType', width: 8 },
      { header: 'Storage Bin', key: 'storageBin', width: 16 },
      { header: 'Material', key: 'materialCode', width: 22 },
      { header: 'Plant', key: 'plant', width: 8 },
      { header: 'Location', key: 'storageLocation', width: 10 },
      { header: 'Avail', key: 'availableQty', width: 10 },
      { header: 'Batch', key: 'batch', width: 14 },
      { header: 'Stock', key: 'stockQty', width: 10 },
      { header: 'Cert. No.', key: 'certificateNo', width: 14 },
      { header: 'GR Date', key: 'grDate', width: 12 },
      { header: 'GR Number', key: 'grNumber', width: 14 },
      { header: 'Delivery', key: 'delivery', width: 14 },
      { header: 'Last Movement', key: 'lastMovementDate', width: 14 },
      { header: 'Last Changer', key: 'lastChanger', width: 14 },
      { header: 'Reservation', key: 'reservation', width: 12 },
      { header: 'Reserved Qty', key: 'reservedQty', width: 12 },
      { header: 'SO Number', key: 'soNumber', width: 16 },
      { header: 'Reserved By', key: 'name', width: 18 },
      { header: 'Zone', key: 'zone', width: 14 },
      { header: 'Reserved Date', key: 'reservedDate', width: 18 },
      { header: 'Reserved Days', key: 'reservedDays', width: 14 },
      { header: 'Age from GR (Days)', key: 'ageFromGrDays', width: 18 },
      { header: 'Shortage Qty', key: 'shortageQty', width: 12 },
    ];
    for (const r of rows) {
      sheet.addRow({
        ...r,
        availableQty: num(r.availableQty),
        stockQty: num(r.stockQty),
        reservedQty: num(r.reservedQty),
        shortageQty: num(r.shortageQty),
        reservedDate: ist(r.reservedDate),
      });
    }
    // keep codes as text so Excel doesn't drop leading zeros
    for (const key of ['materialCode', 'batch', 'soNumber', 'storageBin'])
      sheet.getColumn(key).numFmt = '@';
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return Buffer.from(await book.xlsx.writeBuffer());
  }

  async detail(id: number, userId: number) {
    const actor = await this.actor(userId);
    const item =
      (await this.prisma.freeStockItem.findUnique({
        where: { id },
        include: STOCK_INCLUDE,
      })) ??
      (await this.prisma.freeStockItemArchive.findUnique({
        where: { id },
        include: STOCK_INCLUDE,
      }));
    if (!item) throw new NotFoundException('Stock item not found.');
    return { data: this.display(item, actor) };
  }

  private display(item: StockRecord, actor: Actor) {
    const { reservations, ...stock } = item;
    const reservation =
      item.status === 'OPEN' ? null : (reservations[0] ?? null);
    const today = this.istDay(new Date());
    // SALES can see shortage only for their own reservation; ADMIN sees all.
    const canViewShortage =
      reservation &&
      (actor.role === 'ADMIN' || reservation.reservedById === actor.id);
    const shortage = canViewShortage
      ? Prisma.Decimal.max(
          new Prisma.Decimal(reservation.reservedQty).minus(item.stockQty),
          0,
        )
      : null;
    return {
      ...stock,
      availableQty: item.availableQty?.toFixed() ?? null,
      stockQty: item.stockQty.toFixed(),
      grDate: item.grDate?.toISOString().slice(0, 10) ?? null,
      lastMovementDate:
        item.lastMovementDate?.toISOString().slice(0, 10) ?? null,
      reservation: reservation ? 'Yes' : null,
      reservationId: reservation?.id ?? null,
      reservedQty: reservation?.reservedQty.toFixed() ?? null,
      soNumber: reservation?.soNumber ?? null,
      name: reservation?.reservedByName ?? null,
      zone: reservation?.reservedZoneName ?? null,
      reservedById: reservation?.reservedById ?? null,
      reservedDate: reservation?.reservedAt ?? null,
      reservedDays: reservation
        ? Math.max(
            0,
            Math.round(
              (today - this.istDay(reservation.reservedAt)) / 86400000,
            ),
          )
        : null,
      ageFromGrDays: item.grDate
        ? Math.round((today - item.grDate.getTime()) / 86400000)
        : null,
      shortageQty: shortage?.toFixed() ?? null,
      hasShortage: shortage ? shortage.greaterThan(0) : false,
      canReserve:
        actor.role === 'SALES' &&
        Boolean(item.storageBin) &&
        item.status === 'OPEN' &&
        item.stockQty.greaterThan(0),
      canRelease:
        item.status === 'RESERVED' &&
        Boolean(reservation) &&
        (actor.role === 'ADMIN' || reservation?.reservedById === actor.id),
    };
  }

  private istDay(date: Date): number {
    const shifted = new Date(date.getTime() + 19800000);
    return Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    );
  }

  async uploads(query: FreeStockPageDto, userId: number) {
    await this.actor(userId, ['ADMIN']);
    const where: Prisma.FreeStockUploadWhereInput = query.search?.trim()
      ? { fileName: { contains: query.search.trim(), mode: 'insensitive' } }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.freeStockUpload.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.freeStockUpload.count({ where }),
    ]);
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async uploadDetail(id: number, userId: number) {
    await this.actor(userId, ['ADMIN']);
    const data = await this.prisma.freeStockUpload.findUnique({
      where: { id },
    });
    if (!data) throw new NotFoundException('Stock upload not found.');
    return { data };
  }

  async history(id: number, query: FreeStockPageDto, userId: number) {
    const actor = await this.actor(userId);
    const archived = !(await this.prisma.freeStockItem.findUnique({
      where: { id },
      select: { id: true },
    }));
    if (
      archived &&
      !(await this.prisma.freeStockItemArchive.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Stock item not found.');
    const where = {
      stockItemId: id,
      ...(actor.role === 'ADMIN' ? {} : { reservedById: actor.id }),
    };
    const [data, total] = archived
      ? await this.prisma.$transaction([
          this.prisma.freeStockReservationArchive.findMany({
            where,
            orderBy: { id: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
          }),
          this.prisma.freeStockReservationArchive.count({ where }),
        ])
      : await this.prisma.$transaction([
          this.prisma.freeStockReservation.findMany({
            where,
            orderBy: { id: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
          }),
          this.prisma.freeStockReservation.count({ where }),
        ]);
    return {
      data,
      archived,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async archives(query: FreeStockPageDto, userId: number) {
    const actor = await this.actor(userId);
    const search = query.search?.trim();
    const contains = { contains: search, mode: 'insensitive' as const };
    const where: Prisma.FreeStockItemArchiveWhereInput = search
      ? {
          OR: [
            { materialCode: contains },
            { batch: contains },
            { storageBin: contains },
            { certificateNo: contains },
            { reservations: { some: { soNumber: contains } } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.freeStockItemArchive.findMany({
        where,
        include: STOCK_INCLUDE,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.freeStockItemArchive.count({ where }),
    ]);
    return {
      data: rows.map((row) => this.display(row, actor)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async reservationFile(
    path: string,
    userId: number,
    commit: boolean,
    fileName: string,
  ) {
    const actor = await this.actor(userId, ['SALES']);
    const lines = await this.readReservations(path);
    return this.processReservation(actor, lines, commit, fileName);
  }

  async reserve(dto: ReserveFreeStockDto, userId: number) {
    const actor = await this.actor(userId, ['SALES']);
    return this.processReservation(
      actor,
      normalizeReservationLines(dto.lines),
      true,
      null,
    );
  }

  private async processReservation(
    actor: Actor,
    lines: ReservationInput[],
    commit: boolean,
    sourceFileName: string | null,
  ) {
    if (!actor.salesZone)
      throw new BadRequestException(
        'Your account must have a Sales Zone before reserving stock.',
      );
    if (commit)
      return this.confirmAllocation(actor, lines, null, sourceFileName);
    return this.previewAllocations(actor.id, lines, { sourceFileName });
  }

  async previewBulkReservation(
    path: string,
    userId: number,
    sourceFileName: string,
  ) {
    const actor = await this.actor(userId, ['SALES']);
    if (!actor.salesZone)
      throw new BadRequestException(
        'Your account must have a Sales Zone before reserving stock.',
      );
    const lines = await this.readReservations(path);
    return this.previewAllocations(actor.id, lines, { sourceFileName });
  }

  async previewSelectedReservation(dto: ReserveFreeStockDto, userId: number) {
    const actor = await this.actor(userId, ['SALES']);
    if (!actor.salesZone)
      throw new BadRequestException(
        'Your account must have a Sales Zone before reserving stock.',
      );
    const lines = normalizeReservationLines(dto.lines);
    return this.previewAllocations(actor.id, lines);
  }

  private async previewAllocations(
    userId: number,
    lines: ReservationInput[],
    options?: { sourceFileName: string | null },
  ) {
    const preview = await this.locked((tx) => this.bulkAllocation(tx, lines));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const previewToken = this.signBulkPreview(
      userId,
      preview.fingerprint,
      expiresAt,
    );
    // Track the advisory badge after the stock transaction has released its lock.
    const previewActivityId = await this.previewActivity.record(
      userId,
      expiresAt,
      preview.allocationLines.flatMap((line) => line.allocations),
    );
    return {
      message: 'Review the proposed allocations. Nothing has been reserved.',
      data: {
        ...preview.data,
        ...options,
        previewToken,
        ...(previewActivityId ? { previewActivityId } : {}),
      },
    };
  }

  async confirmSelectedReservation(
    dto: ConfirmSelectedFreeStockDto,
    userId: number,
  ) {
    const actor = await this.actor(userId, ['SALES']);
    if (!actor.salesZone)
      throw new BadRequestException(
        'Your account must have a Sales Zone before reserving stock.',
      );
    const lines = normalizeReservationLines(dto.lines);
    const approved = this.approvedBulkFingerprint(dto.previewToken, actor.id);
    return this.confirmAllocation(actor, lines, approved, null);
  }

  private async bulkAllocation(
    tx: Prisma.TransactionClient,
    lines: ReservationInput[],
  ) {
    const codes = [...new Set(lines.map((line) => line.materialCode))];
    const items = await tx.freeStockItem.findMany({
      where: {
        materialCode: { in: codes },
        status: 'OPEN',
        stockQty: { gt: 0 },
        reservations: { none: { releasedAt: null, closedAt: null } },
      },
      include: STOCK_INCLUDE,
    });
    const allocation = allocateClosestStock(lines, items);
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(allocation))
      .digest('hex');
    return {
      fingerprint,
      allocationLines: allocation.lines,
      data: {
        ...allocation,
        lines: allocation.lines.map((line) => ({
          ...line,
          allocations: line.allocations.map(({ version, ...item }) => item),
        })),
      },
    };
  }

  private bulkPreviewKey(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret)
      throw new Error('JWT_SECRET is required for bulk reservation previews.');
    return secret;
  }

  private signBulkPreview(
    actorId: number,
    fingerprint: string,
    expiresAt: Date,
  ): string {
    const payload = Buffer.from(
      JSON.stringify({
        actorId,
        fingerprint,
        expiresAt: expiresAt.getTime(),
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', this.bulkPreviewKey())
      .update('free-stock-bulk:' + payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private approvedBulkFingerprint(token: string, actorId: number): string {
    const invalid = () =>
      new ConflictException({
        code: 'FREE_STOCK_BULK_PREVIEW_EXPIRED',
        message:
          'This preview is invalid or has expired. Preview the file again before confirming.',
      });
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) throw invalid();
    const expected = createHmac('sha256', this.bulkPreviewKey())
      .update('free-stock-bulk:' + payload)
      .digest();
    const received = Buffer.from(signature, 'base64url');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      throw invalid();
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      if (
        data.actorId !== actorId ||
        typeof data.expiresAt !== 'number' ||
        data.expiresAt <= Date.now() ||
        typeof data.fingerprint !== 'string'
      )
        throw invalid();
      return data.fingerprint;
    } catch {
      throw invalid();
    }
  }

  async confirmBulkReservation(
    path: string,
    previewToken: string,
    userId: number,
    sourceFileName: string,
  ) {
    const actor = await this.actor(userId, ['SALES']);
    if (!actor.salesZone)
      throw new BadRequestException(
        'Your account must have a Sales Zone before reserving stock.',
      );
    const approved = this.approvedBulkFingerprint(previewToken, actor.id);
    const lines = await this.readReservations(path);
    return this.confirmAllocation(actor, lines, approved, sourceFileName);
  }

  /** Both Excel and selected-row confirmations share the same atomic allocator. */
  private async confirmAllocation(
    actor: Actor,
    lines: ReservationInput[],
    approved: string | null,
    sourceFileName: string | null,
  ) {
    return this.locked(async (tx) => {
      const preview = await this.bulkAllocation(tx, lines);
      if (approved !== null && preview.fingerprint !== approved)
        throw new ConflictException({
          code: 'FREE_STOCK_BULK_PREVIEW_CHANGED',
          message:
            'Stock or reservations changed since preview. Nothing was reserved. Preview the file again.',
        });
      const selected = preview.data.lines.flatMap((line) =>
        line.allocations.map((allocation) => ({
          ...allocation,
          soNumber: line.soNumber,
        })),
      );
      if (!selected.length)
        throw new ConflictException(
          'No requested stock is available. Nothing was reserved.',
        );
      const bulkReservationId = randomUUID(),
        reservedAt = new Date();
      for (let offset = 0; offset < selected.length; offset += 500) {
        const chunk = selected.slice(offset, offset + 500);
        await tx.freeStockReservation.createMany({
          data: chunk.map((line) => ({
            bulkReservationId,
            stockItemId: line.stockItemId,
            reservedQty: new Prisma.Decimal(line.allocatedQty),
            soNumber: line.soNumber,
            reservedById: actor.id,
            reservedByName: actor.name,
            reservedZoneId: actor.salesZone!.id,
            reservedZoneName: actor.salesZone!.name,
            reservedAt,
            sourceFileName,
          })),
        });
        const changed = await tx.freeStockItem.updateMany({
          where: {
            id: { in: chunk.map((line) => line.stockItemId) },
            status: 'OPEN',
          },
          data: { status: 'RESERVED' },
        });
        if (changed.count !== chunk.length)
          throw new ConflictException(
            'Stock changed. The entire confirmation was rolled back. Preview again.',
          );
      }
      return {
        message:
          'Available allocations reserved successfully. Review any pending quantities below.',
        data: {
          ...preview.data,
          bulkReservationId,
          reservedAt,
          reservedRows: selected.length,
          canConfirm: false,
        },
      };
    });
  }

  async release(ids: number[], userId: number) {
    const actor = await this.actor(userId);
    return this.locked(async (tx) => {
      const items = await tx.freeStockItem.findMany({
        where: { id: { in: ids } },
        include: STOCK_INCLUDE,
      });
      const map = new Map(items.map((item) => [item.id, item]));
      const errors = ids.flatMap((id) => {
        const item = map.get(id);
        const reservation = item?.reservations[0];
        if (
          !item ||
          item.status !== 'RESERVED' ||
          !reservation ||
          reservation.closedAt
        )
          return [
            { stockItemId: id, message: 'Item is not actively RESERVED.' },
          ];
        if (actor.role !== 'ADMIN' && reservation.reservedById !== actor.id)
          return [
            {
              stockItemId: id,
              message: 'Only the owner or ADMIN can release this reservation.',
            },
          ];
        return [];
      });
      if (errors.length)
        throw new ConflictException({
          code: 'FREE_STOCK_RELEASE_REJECTED',
          message: 'Nothing was released.',
          errors,
        });
      const now = new Date();
      await tx.freeStockReservation.updateMany({
        where: { stockItemId: { in: ids }, releasedAt: null, closedAt: null },
        data: {
          releasedAt: now,
          releasedById: actor.id,
          releasedByName: actor.name,
        },
      });
      const changed = await tx.freeStockItem.updateMany({
        where: { id: { in: ids }, status: 'RESERVED' },
        data: { status: 'OPEN' },
      });
      if (changed.count !== ids.length)
        throw new ConflictException(
          'Stock changed. The entire release was rolled back.',
        );
      return {
        message: 'Reservations released successfully.',
        data: { releasedRows: changed.count },
      };
    });
  }

  async template(userId: number): Promise<Buffer> {
    await this.actor(userId, ['ADMIN', 'SALES']);
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Reservations');
    const aliases = await this.columnConfig.reservations();
    sheet.columns = [
      {
        header: aliases.materialCode[0].toUpperCase(),
        key: 'material',
        width: 28,
      },
      { header: aliases.qty[0].toUpperCase(), key: 'qty', width: 14 },
      { header: aliases.soNumber[0].toUpperCase(), key: 'so', width: 24 },
    ];
    for (const column of [1, 3]) sheet.getColumn(column).numFmt = '@';
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return Buffer.from(await book.xlsx.writeBuffer());
  }
}
