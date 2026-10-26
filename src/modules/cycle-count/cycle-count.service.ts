import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { getIstTimestampRange, parseYmdDateOnly } from '../../common/utils/date-only.util';
import { decodeUploadFileName } from '../bom-audit/bom-audit-file.parser';
import {
  CYCLE_COUNT_CNC_FILTER,
  CYCLE_COUNT_EXCLUDE_REASON_LABELS,
  CYCLE_COUNT_INSERT_CHUNK_SIZE,
  CYCLE_COUNT_MATERIAL_CLASSES,
  CYCLE_COUNT_MAX_EXCLUDED_RETURNED,
  CYCLE_COUNT_MOVEMENT,
  CYCLE_COUNT_MOVEMENT_LEVEL,
  CYCLE_COUNT_NO_DIGITS,
  CYCLE_COUNT_NO_LOCK_KEY,
  CYCLE_COUNT_NO_PREFIX,
  CYCLE_COUNT_SELECTION_METHOD,
  CYCLE_COUNT_STATUS,
} from './cycle-count.constants';
import { CycleCountFileError, parseCycleCountStockFile } from './cycle-count-stock.parser';
import { BinMovement, CycleCountMovementService } from './cycle-count-movement.service';
import {
  CreateCycleCountDto,
  CycleCountPlanCriteriaDto,
  PreviewCycleCountPlanDto,
} from './dto/plan-cycle-count.dto';
import { QueryCycleCountDto } from './dto/query-cycle-count.dto';

export interface CycleCountActor {
  userId: number;
  name: string;
}

/** Valid stock of one storage bin (from the uploaded LX03 file). */
interface LocationStock {
  storageBin: string;
  lines: number;
  totalQty: number;
  packages: Set<string>;
  classes: Set<string>;
  cncYes: number;
  cncNo: number;
}

/** One location that can be planned, with its movement in the selected period. */
export interface CycleCountCandidate {
  storageBin: string;
  movementLines: number;
  transferOrders: number;
  archivedLines: number;
  movementLevel: string;
  packages: number;
  lines: number;
  totalQty: number;
  classes: string[];
  /** null = the stock file has no CNC column */
  hasCnc: boolean | null;
}

const AUDIT_SUMMARY_SELECT = {
  id: true,
  auditNo: true,
  auditName: true,
  status: true,
  operatorId: true,
  operatorName: true,
  stockUploadId: true,
  stockFileName: true,
  movementFrom: true,
  movementTo: true,
  includeArchived: true,
  selectionMethod: true,
  cncFilter: true,
  materialClasses: true,
  totalLocations: true,
  totalLines: true,
  uploadBatchId: true,
  createdByName: true,
  createdAt: true,
  cancelledAt: true,
  cancelledByName: true,
} satisfies Prisma.CycleCountAuditSelect;

type AuditSummaryRow = Prisma.CycleCountAuditGetPayload<{ select: typeof AUDIT_SUMMARY_SELECT }>;

const MAX_AUDIT_NO_ATTEMPTS = 3;
const natural = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
const ymd = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class CycleCountService {
  private readonly logger = new Logger(CycleCountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly movement: CycleCountMovementService,
  ) {}

  // ================================================================ A1 + A3: stock upload & validation

  async uploadStock(file: Express.Multer.File | undefined, actor: CycleCountActor) {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Please upload the SAP LX03 stock file.' });
    }
    const fileName = decodeUploadFileName(file.originalname || 'LX03.xlsx');

    let parsed: Awaited<ReturnType<typeof parseCycleCountStockFile>>;
    try {
      parsed = await parseCycleCountStockFile(Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer), fileName);
    } catch (error) {
      if (error instanceof CycleCountFileError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }

    const valid = parsed.rows.filter((r) => !r.excludeReason);
    if (!valid.length) {
      throw new BadRequestException({
        code: 'NO_VALID_ROWS',
        message: 'No row of the file can be audited (all rows have zero stock or invalid data).',
      });
    }
    const totalLocations = new Set(valid.map((r) => r.storageBin)).size;
    const totalPackages = new Set(valid.filter((r) => r.certNo).map((r) => `${r.storageBin}|${r.certNo}`)).size;

    let uploadId: number;
    try {
      uploadId = await this.prisma.$transaction(
        async (tx) => {
          const upload = await tx.cycleCountStockUpload.create({
            data: {
              fileName,
              totalRows: parsed.totalRows,
              validRows: valid.length,
              excludedRows: parsed.rows.length - valid.length,
              totalLocations,
              totalPackages,
              hasCertNoColumn: parsed.hasCertNoColumn,
              hasCncColumn: parsed.hasCncColumn,
              hasClassColumn: parsed.hasClassColumn,
              uploadedById: actor.userId,
              uploadedByName: actor.name,
            },
            select: { id: true },
          });
          for (let i = 0; i < parsed.rows.length; i += CYCLE_COUNT_INSERT_CHUNK_SIZE) {
            await tx.cycleCountStockRow.createMany({
              data: parsed.rows.slice(i, i + CYCLE_COUNT_INSERT_CHUNK_SIZE).map((r) => ({ uploadId: upload.id, ...r })),
            });
          }
          return upload.id;
        },
        { timeout: 60_000 },
      );
    } catch (error) {
      this.logger.error(`Failed to save Cycle Count stock upload (${fileName})`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException({ code: 'STOCK_UPLOAD_SAVE_FAILED', message: 'Failed to save the stock file. Please try again.' });
    }

    this.logger.log(
      `Cycle Count stock "${fileName}" uploaded by ${actor.name}: ${parsed.totalRows} rows, ${valid.length} valid, ${totalLocations} locations`,
    );
    const result = await this.getStockUpload(uploadId);
    return { ...result, message: 'Stock file uploaded and validated successfully.' };
  }

  /** Upload summary + reasons + the excluded rows (for the "View excluded rows" table). */
  async getStockUpload(id: number) {
    const upload = await this.getUploadOrThrow(id);
    const [reasonGroups, excluded] = await this.prisma.$transaction([
      this.prisma.cycleCountStockRow.groupBy({
        by: ['excludeReason'],
        where: { uploadId: id, excludeReason: { not: null } },
        _count: { _all: true },
        orderBy: { excludeReason: 'asc' },
      }),
      this.prisma.cycleCountStockRow.findMany({
        where: { uploadId: id, excludeReason: { not: null } },
        orderBy: { rowNo: 'asc' },
        take: CYCLE_COUNT_MAX_EXCLUDED_RETURNED,
        select: { rowNo: true, storageBin: true, materialCode: true, qty: true, certNo: true, excludeReason: true },
      }),
    ]);

    return {
      message: 'Stock upload fetched successfully.',
      data: {
        ...upload,
        excludedByReason: reasonGroups.map((g) => ({
          reason: g.excludeReason as string,
          label: CYCLE_COUNT_EXCLUDE_REASON_LABELS[g.excludeReason as string] ?? g.excludeReason,
          count: (g._count as { _all: number })._all,
        })),
        // First CYCLE_COUNT_MAX_EXCLUDED_RETURNED excluded rows (excludedRows above is the full count)
        excludedSample: excluded.map((r) => ({
          ...r,
          qty: r.qty === null ? null : r.qty.toNumber(),
          reasonLabel: CYCLE_COUNT_EXCLUDE_REASON_LABELS[r.excludeReason as string] ?? r.excludeReason,
        })),
      },
    };
  }

  // ================================================================ A2 + A4: plan preview

  async previewPlan(dto: PreviewCycleCountPlanDto) {
    const upload = await this.getUploadOrThrow(dto.stockUploadId);
    const range = this.resolveRange(dto.fromDate, dto.toDate);
    const { candidates, totals, filters } = await this.buildCandidates(dto, upload, range);

    let plan: CycleCountCandidate[];
    if (dto.selectionMethod === CYCLE_COUNT_SELECTION_METHOD.MANUAL) {
      const picked = new Set(dto.storageBins ?? []);
      const byBin = new Map(candidates.map((c) => [c.storageBin, c]));
      const unknown = [...picked].filter((b) => !byBin.has(b));
      if (unknown.length) throw this.binsNotPlannable(unknown);
      plan = candidates.filter((c) => picked.has(c.storageBin));
    } else if (dto.selectionMethod === CYCLE_COUNT_SELECTION_METHOD.RANDOM) {
      plan = this.shuffle([...candidates]).slice(0, dto.locationCount);
    } else {
      // BUSIEST - candidates are already sorted busiest first
      plan = candidates.slice(0, dto.locationCount);
    }

    return {
      message: 'Plan preview generated.',
      data: {
        stockUpload: { id: upload.id, fileName: upload.fileName, totalLocations: upload.totalLocations },
        movement: {
          fromDate: dto.fromDate,
          toDate: dto.toDate,
          includeArchived: dto.includeArchived,
          dateColumn: CYCLE_COUNT_MOVEMENT.dateColumn,
          ...totals,
        },
        filters,
        candidateCount: candidates.length,
        // MANUAL: every candidate is listed so the admin can tick them
        candidates: dto.selectionMethod === CYCLE_COUNT_SELECTION_METHOD.MANUAL ? candidates : undefined,
        plan,
        planTotals: {
          locations: plan.length,
          lines: plan.reduce((s, c) => s + c.lines, 0),
          packages: plan.reduce((s, c) => s + c.packages, 0),
        },
      },
    };
  }

  // ================================================================ A5: release (one audit per operator)

  async createAudits(dto: CreateCycleCountDto, actor: CycleCountActor) {
    const upload = await this.getUploadOrThrow(dto.stockUploadId);
    const range = this.resolveRange(dto.fromDate, dto.toDate);

    // Operators: USER role only, in the order the admin picked them
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.operatorIds } },
      select: { id: true, name: true, role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const badOperators = dto.operatorIds.filter((id) => byId.get(id)?.role !== 'USER');
    if (badOperators.length) {
      throw new BadRequestException({
        code: 'INVALID_OPERATOR',
        message: `Operator(s) ${badOperators.join(', ')} do not exist or are not operators (USER role).`,
      });
    }
    if (dto.operatorIds.length > dto.storageBins.length) {
      throw new BadRequestException({
        code: 'TOO_MANY_OPERATORS',
        message: `The plan has ${dto.storageBins.length} location(s) but ${dto.operatorIds.length} operators were selected. Select fewer operators.`,
      });
    }

    // The bins must still match the same criteria the admin previewed (movement level is taken from here)
    const { candidates } = await this.buildCandidates(dto, upload, range);
    const byBin = new Map(candidates.map((c) => [c.storageBin, c]));
    const unknown = dto.storageBins.filter((b) => !byBin.has(b));
    if (unknown.length) throw this.binsNotPlannable(unknown);

    // Expected stock of the planned bins (same material + package + batch merged)
    const stockRows = await this.prisma.cycleCountStockRow.findMany({
      where: { uploadId: upload.id, excludeReason: null, storageBin: { in: dto.storageBins } },
      orderBy: { rowNo: 'asc' },
      select: { storageBin: true, materialCode: true, certNo: true, batch: true, qty: true },
    });
    const expectedByBin = new Map<string, Map<string, { materialCode: string; certNo: string | null; batch: string | null; qty: number }>>();
    for (const r of stockRows) {
      if (!expectedByBin.has(r.storageBin)) expectedByBin.set(r.storageBin, new Map());
      const lines = expectedByBin.get(r.storageBin)!;
      const key = `${r.materialCode}|${r.certNo ?? ''}|${r.batch ?? ''}`;
      const qty = r.qty ? r.qty.toNumber() : 0;
      const existing = lines.get(key);
      if (existing) existing.qty = Math.round((existing.qty + qty) * 1000) / 1000;
      else lines.set(key, { materialCode: r.materialCode, certNo: r.certNo, batch: r.batch, qty });
    }

    // Share the bins: sorted by bin, one block of neighbouring bins per operator
    const sortedBins = [...dto.storageBins].sort(natural);
    const size = Math.ceil(sortedBins.length / dto.operatorIds.length);
    const groups = dto.operatorIds.map((id, i) => ({
      operator: { id, name: byId.get(id)!.name },
      bins: sortedBins.slice(i * size, (i + 1) * size),
    })).filter((g) => g.bins.length);

    const uploadBatchId = randomUUID();
    const audits = await this.saveAuditsWithRetry(dto, upload, groups, byBin, expectedByBin, uploadBatchId, actor);

    this.logger.log(
      `Cycle Count "${dto.auditName}" released by ${actor.name}: ${audits.length} audit(s) ` +
        `[${audits.map((a) => `${a.auditNo} -> ${a.operatorName}`).join(', ')}], ${dto.storageBins.length} locations, ` +
        `movement ${dto.fromDate}..${dto.toDate}${dto.includeArchived ? ' incl. archived' : ''}`,
    );

    return {
      message:
        audits.length === 1
          ? 'Cycle Count audit released successfully.'
          : `${audits.length} Cycle Count audits released successfully (one per operator).`,
      data: { auditName: dto.auditName, uploadBatchId, totalLocations: dto.storageBins.length, audits: audits.map((a) => this.toSummary(a)) },
    };
  }

  private async saveAuditsWithRetry(
    dto: CreateCycleCountDto,
    upload: { id: number; fileName: string },
    groups: { operator: { id: number; name: string }; bins: string[] }[],
    candidates: Map<string, CycleCountCandidate>,
    expectedByBin: Map<string, Map<string, { materialCode: string; certNo: string | null; batch: string | null; qty: number }>>,
    uploadBatchId: string,
    actor: CycleCountActor,
  ): Promise<AuditSummaryRow[]> {
    for (let attempt = 1; attempt <= MAX_AUDIT_NO_ATTEMPTS; attempt++) {
      try {
        // All audits of one plan are saved together: all or nothing
        return await this.prisma.$transaction(
          async (tx) => {
            const saved: AuditSummaryRow[] = [];
            for (const group of groups) {
              const auditNo = await this.nextAuditNo(tx);
              const totalLines = group.bins.reduce((s, b) => s + (expectedByBin.get(b)?.size ?? 0), 0);
              const audit = await tx.cycleCountAudit.create({
                data: {
                  auditNo,
                  auditName: dto.auditName,
                  status: CYCLE_COUNT_STATUS.ASSIGNED,
                  operatorId: group.operator.id,
                  operatorName: group.operator.name,
                  stockUploadId: upload.id,
                  stockFileName: upload.fileName,
                  movementFrom: parseYmdDateOnly(dto.fromDate)!,
                  movementTo: parseYmdDateOnly(dto.toDate)!,
                  includeArchived: dto.includeArchived,
                  selectionMethod: dto.selectionMethod,
                  cncFilter: dto.cncFilter,
                  materialClasses: [...dto.materialClasses].sort().join(','),
                  totalLocations: group.bins.length,
                  totalLines,
                  uploadBatchId,
                  createdById: actor.userId,
                  createdByName: actor.name,
                },
                select: AUDIT_SUMMARY_SELECT,
              });

              // sequenceNo restarts at 1 in every audit (each operator walks only their own bins)
              await tx.cycleCountLocation.createMany({
                data: group.bins.map((bin, index) => ({
                  auditId: audit.id,
                  storageBin: bin,
                  sequenceNo: index + 1,
                  movementLines: candidates.get(bin)?.movementLines ?? 0,
                  movementLevel: candidates.get(bin)?.movementLevel ?? CYCLE_COUNT_MOVEMENT_LEVEL.NONE,
                  expectedLines: expectedByBin.get(bin)?.size ?? 0,
                })),
              });
              const locations = await tx.cycleCountLocation.findMany({
                where: { auditId: audit.id },
                select: { id: true, storageBin: true },
              });
              const materials = locations.flatMap((loc) =>
                [...(expectedByBin.get(loc.storageBin)?.values() ?? [])].map((m) => ({
                  auditId: audit.id,
                  auditLocationId: loc.id,
                  materialCode: m.materialCode,
                  certNo: m.certNo,
                  batch: m.batch,
                  expectedQty: m.qty,
                })),
              );
              for (let i = 0; i < materials.length; i += CYCLE_COUNT_INSERT_CHUNK_SIZE) {
                await tx.cycleCountMaterial.createMany({ data: materials.slice(i, i + CYCLE_COUNT_INSERT_CHUNK_SIZE) });
              }
              saved.push(audit);
            }
            return saved;
          },
          { timeout: 60_000 },
        );
      } catch (error) {
        const isAuditNoClash =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          `${JSON.stringify(error.meta ?? {})} ${error.message}`.includes('auditNo');
        if (isAuditNoClash && attempt < MAX_AUDIT_NO_ATTEMPTS) continue;

        this.logger.error('Failed to save Cycle Count audit(s)', error instanceof Error ? error.stack : String(error));
        throw new InternalServerErrorException({ code: 'CYCLE_COUNT_SAVE_FAILED', message: 'Failed to release the Cycle Count audit. Please try again.' });
      }
    }
    throw new InternalServerErrorException({ code: 'CYCLE_COUNT_SAVE_FAILED', message: 'Failed to release the Cycle Count audit. Please try again.' });
  }

  /** AUD-CC-2026-0001 ... (per year, India time). The advisory lock serialises parallel releases. */
  private async nextAuditNo(tx: Prisma.TransactionClient): Promise<string> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CYCLE_COUNT_NO_LOCK_KEY}::bigint)`;
    const year = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date());
    const prefix = `${CYCLE_COUNT_NO_PREFIX}-${year}-`;
    const last = await tx.cycleCountAudit.findFirst({
      where: { auditNo: { startsWith: prefix } },
      orderBy: { auditNo: 'desc' },
      select: { auditNo: true },
    });
    const lastNumber = last ? Number(last.auditNo.slice(prefix.length)) : 0;
    const next = (Number.isFinite(lastNumber) ? lastNumber : 0) + 1;
    return `${prefix}${String(next).padStart(CYCLE_COUNT_NO_DIGITS, '0')}`;
  }

  // ================================================================ shared planning logic

  /**
   * Locations of the stock file that pass the CNC / class filters, with their movement in the period.
   * Sorted busiest first. Movement level: the busiest third = HIGH, next third = MEDIUM, rest = LOW, no movement = NONE.
   */
  private async buildCandidates(
    criteria: CycleCountPlanCriteriaDto,
    upload: { id: number; hasCncColumn: boolean; hasClassColumn: boolean },
    range: { from: Date; toExclusive: Date },
  ) {
    const stock = await this.loadLocationStock(upload.id);
    const selectedClasses = new Set(criteria.materialClasses);
    const allClasses = CYCLE_COUNT_MATERIAL_CLASSES.every((c) => selectedClasses.has(c));
    const cncApplied = upload.hasCncColumn && criteria.cncFilter !== CYCLE_COUNT_CNC_FILTER.BOTH;
    const classApplied = upload.hasClassColumn && !allClasses;

    const notes: string[] = [];
    if (!upload.hasCncColumn && criteria.cncFilter !== CYCLE_COUNT_CNC_FILTER.BOTH) {
      notes.push('The stock file has no CNC column, so the CNC filter was not applied.');
    }
    if (!upload.hasClassColumn && !allClasses) {
      notes.push('The stock file has no material class column, so the A / B / C filter was not applied.');
    }

    const filtered = [...stock.values()].filter((loc) => {
      if (cncApplied) {
        if (criteria.cncFilter === CYCLE_COUNT_CNC_FILTER.WITH_CNC && !loc.cncYes) return false;
        if (criteria.cncFilter === CYCLE_COUNT_CNC_FILTER.WITHOUT_CNC && !loc.cncNo) return false;
      }
      if (classApplied && ![...loc.classes].some((c) => selectedClasses.has(c))) return false;
      return true;
    });

    const { byBin, totals } = await this.movement.countByBin(
      [...stock.keys()],
      range.from,
      range.toExclusive,
      criteria.includeArchived,
    );

    const empty: BinMovement = { lines: 0, transferOrders: 0, archivedLines: 0 };
    const candidates: CycleCountCandidate[] = filtered.map((loc) => {
      const m = byBin.get(loc.storageBin) ?? empty;
      return {
        storageBin: loc.storageBin,
        movementLines: m.lines,
        transferOrders: m.transferOrders,
        archivedLines: m.archivedLines,
        movementLevel: CYCLE_COUNT_MOVEMENT_LEVEL.NONE,
        packages: loc.packages.size,
        lines: loc.lines,
        totalQty: Math.round(loc.totalQty * 1000) / 1000,
        classes: [...loc.classes].sort(),
        hasCnc: upload.hasCncColumn ? loc.cncYes > 0 : null,
      };
    });
    candidates.sort((a, b) => b.movementLines - a.movementLines || natural(a.storageBin, b.storageBin));

    const moving = candidates.filter((c) => c.movementLines > 0);
    moving.forEach((c, i) => {
      c.movementLevel =
        i < moving.length / 3
          ? CYCLE_COUNT_MOVEMENT_LEVEL.HIGH
          : i < (2 * moving.length) / 3
            ? CYCLE_COUNT_MOVEMENT_LEVEL.MEDIUM
            : CYCLE_COUNT_MOVEMENT_LEVEL.LOW;
    });

    return {
      candidates,
      totals,
      filters: { cncApplied, classApplied, notes },
    };
  }

  private async loadLocationStock(uploadId: number): Promise<Map<string, LocationStock>> {
    const rows = await this.prisma.cycleCountStockRow.findMany({
      where: { uploadId, excludeReason: null },
      select: { storageBin: true, certNo: true, qty: true, isCnc: true, materialClass: true },
    });
    const map = new Map<string, LocationStock>();
    for (const r of rows) {
      let loc = map.get(r.storageBin);
      if (!loc) {
        loc = { storageBin: r.storageBin, lines: 0, totalQty: 0, packages: new Set(), classes: new Set(), cncYes: 0, cncNo: 0 };
        map.set(r.storageBin, loc);
      }
      loc.lines += 1;
      loc.totalQty += r.qty ? r.qty.toNumber() : 0;
      if (r.certNo) loc.packages.add(r.certNo);
      if (r.materialClass) loc.classes.add(r.materialClass);
      if (r.isCnc === true) loc.cncYes += 1;
      if (r.isCnc === false) loc.cncNo += 1;
    }
    return map;
  }

  /** YYYY-MM-DD (India time) -> [from, toExclusive). Checks order and the maximum range. */
  private resolveRange(fromDate: string, toDate: string) {
    const from = getIstTimestampRange(fromDate);
    const to = getIstTimestampRange(toDate);
    if (!from || !to) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'From and To dates are required.' });
    }
    if (from.startOfDay >= to.endOfDay) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'From date must be on or before To date.' });
    }
    const days = Math.round((to.endOfDay.getTime() - from.startOfDay.getTime()) / 86_400_000);
    if (days > CYCLE_COUNT_MOVEMENT.maxRangeDays) {
      throw new BadRequestException({
        code: 'DATE_RANGE_TOO_LONG',
        message: `The date range can be at most ${CYCLE_COUNT_MOVEMENT.maxRangeDays} days.`,
      });
    }
    return { from: from.startOfDay, toExclusive: to.endOfDay };
  }

  private async getUploadOrThrow(id: number) {
    const upload = await this.prisma.cycleCountStockUpload.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        totalRows: true,
        validRows: true,
        excludedRows: true,
        totalLocations: true,
        totalPackages: true,
        hasCertNoColumn: true,
        hasCncColumn: true,
        hasClassColumn: true,
        uploadedByName: true,
        createdAt: true,
      },
    });
    if (!upload) {
      throw new NotFoundException({ code: 'STOCK_UPLOAD_NOT_FOUND', message: `Stock upload with ID ${id} not found. Please upload the stock file again.` });
    }
    return upload;
  }

  private binsNotPlannable(bins: string[]) {
    return new BadRequestException({
      code: 'LOCATIONS_NOT_PLANNABLE',
      message: `${bins.length} location(s) are not in the stock file or do not match the selected filters: ${bins.slice(0, 10).join(', ')}${bins.length > 10 ? ' ...' : ''}. Generate the plan again.`,
    });
  }

  /** Fisher-Yates with a crypto random source. */
  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  // ================================================================ list / detail / cancel / operators

  async getOperators() {
    const operators = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    return { message: 'Operators fetched successfully.', count: operators.length, data: operators };
  }

  async findAll(query: QueryCycleCountDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.CycleCountAuditWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { auditNo: { contains: query.search, mode: 'insensitive' } },
        { auditName: { contains: query.search, mode: 'insensitive' } },
        { stockFileName: { contains: query.search, mode: 'insensitive' } },
        { operatorName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.fromDate || query.toDate) {
      const from = query.fromDate ? getIstTimestampRange(query.fromDate) : undefined;
      const to = query.toDate ? getIstTimestampRange(query.toDate) : undefined;
      if (from && to && from.startOfDay >= to.endOfDay) {
        throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'fromDate must be on or before toDate.' });
      }
      where.createdAt = { ...(from ? { gte: from.startOfDay } : {}), ...(to ? { lt: to.endOfDay } : {}) };
    }

    const [total, audits] = await this.prisma.$transaction([
      this.prisma.cycleCountAudit.count({ where }),
      this.prisma.cycleCountAudit.findMany({
        where,
        select: AUDIT_SUMMARY_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      message: 'Cycle Count audits fetched successfully.',
      data: audits.map((a) => this.toSummary(a)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const audit = await this.prisma.cycleCountAudit.findUnique({
      where: { id },
      select: {
        ...AUDIT_SUMMARY_SELECT,
        updatedAt: true,
        locations: {
          orderBy: { sequenceNo: 'asc' },
          select: {
            id: true,
            sequenceNo: true,
            storageBin: true,
            movementLines: true,
            movementLevel: true,
            expectedLines: true,
            materials: {
              orderBy: [{ certNo: 'asc' }, { materialCode: 'asc' }],
              select: { id: true, materialCode: true, certNo: true, batch: true, expectedQty: true },
            },
          },
        },
      },
    });
    if (!audit) {
      throw new NotFoundException({ code: 'CYCLE_COUNT_NOT_FOUND', message: `Cycle Count audit with ID ${id} not found.` });
    }
    return {
      message: 'Cycle Count audit fetched successfully.',
      data: {
        ...this.toSummary(audit),
        updatedAt: audit.updatedAt,
        locations: audit.locations.map((l) => ({
          ...l,
          materials: l.materials.map((m) => ({ ...m, expectedQty: m.expectedQty.toNumber() })),
        })),
      },
    };
  }

  async cancel(id: number, actor: CycleCountActor) {
    const result = await this.prisma.cycleCountAudit.updateMany({
      where: { id, status: CYCLE_COUNT_STATUS.ASSIGNED },
      data: { status: CYCLE_COUNT_STATUS.CANCELLED, cancelledAt: new Date(), cancelledByName: actor.name },
    });
    if (result.count === 0) {
      const existing = await this.prisma.cycleCountAudit.findUnique({ where: { id }, select: { status: true } });
      if (!existing) {
        throw new NotFoundException({ code: 'CYCLE_COUNT_NOT_FOUND', message: `Cycle Count audit with ID ${id} not found.` });
      }
      throw new ConflictException({
        code: 'CYCLE_COUNT_NOT_CANCELLABLE',
        message: `Only ASSIGNED audits can be cancelled. This audit is ${existing.status}.`,
      });
    }
    const audit = await this.prisma.cycleCountAudit.findUniqueOrThrow({ where: { id }, select: AUDIT_SUMMARY_SELECT });
    this.logger.log(`Cycle Count ${audit.auditNo} cancelled by ${actor.name}`);
    return { message: 'Cycle Count audit cancelled successfully.', data: this.toSummary(audit) };
  }

  /** DATE columns go out as YYYY-MM-DD; material classes as a list. */
  private toSummary<T extends AuditSummaryRow>(a: T) {
    return {
      ...a,
      movementFrom: ymd(a.movementFrom),
      movementTo: ymd(a.movementTo),
      materialClasses: a.materialClasses ? a.materialClasses.split(',') : [],
    };
  }
}
