import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma.service';
import { getIstTimestampRange } from '../../../common/utils/date-only.util';
import { CreateCycleCountAuditDto, PreviewCycleCountAuditDto } from './dto/create-cycle-count-audit.dto';
import { QueryBomAuditDto } from '../bom-completeness/dto/query-bom-audit.dto';
import {
  BOM_AUDIT_INSERT_CHUNK_SIZE,
  BOM_AUDIT_MAX_LENGTH,
  BOM_AUDIT_MAX_OPERATOR_ID,
  BOM_AUDIT_MAX_REPORTED_ERRORS,
  BOM_AUDIT_STATUS,
} from '../bom-completeness/bom-audit.constants';
import {
  BomAuditFileError,
  BomAuditParseResult,
  ParsedBomAuditLocation,
  parseBomAuditFile,
} from '../bom-completeness/bom-audit-file.parser';
import { decodeUploadFileName } from '../shared/audit-excel.util';
import { nextAuditNo } from '../shared/audit-number.util';
import { AuditOperatorsService } from '../shared/audit-operators.service';
import { BomAuditColumnConfigService } from '../bom-completeness/bom-audit-column-config.service';
import { AUDIT_NO_REGISTRY } from '../shared/audit.constants';
import { cycleCountDateRange, parseCycleCountDate } from './cycle-count-date.util';
import { CycleCountSourceService, CycleCountSelection } from './cycle-count-source.service';

export interface CycleCountAuditActor {
  userId: number;
  name: string;
}

const AUDIT_SUMMARY_SELECT = {
  id: true,
  auditNo: true,
  auditName: true,
  fileName: true,
  status: true,
  operatorId: true,
  operatorName: true,
  totalLocations: true,
  totalMaterials: true,
  createdByName: true,
  createdAt: true,
  uploadBatchId: true,
  issueFromDate: true,
  issueToDate: true,
  sourceSoCount: true,
  qualifyingSoCount: true,
  sourceBinCount: true,
  uploadedBinCount: true,
  matchedBinCount: true,
} satisfies Prisma.CycleCountAuditSelect;

const AUDIT_LIST_SELECT = {
  ...AUDIT_SUMMARY_SELECT,
  locations: {
    select: { sequenceNo: true, storageBin: true },
    orderBy: { sequenceNo: 'asc' },
  },
} satisfies Prisma.CycleCountAuditSelect;

type AuditSummary = Prisma.CycleCountAuditGetPayload<{
  select: typeof AUDIT_SUMMARY_SELECT;
}>;

const MAX_AUDIT_NO_ATTEMPTS = 3;

@Injectable()
export class CycleCountAuditService {
  private readonly logger = new Logger(CycleCountAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly operators: AuditOperatorsService,
    private readonly columnConfig: BomAuditColumnConfigService,
    private readonly source: CycleCountSourceService,
  ) {}

  async previewAudit(file: Express.Multer.File | undefined, dto: PreviewCycleCountAuditDto) {
    const { fileName, parsed, selection } = await this.readSelectedUpload(file, dto);
    const { valid } = await this.checkOperators(parsed, []);

    return {
      message: 'Cycle Count audit file checked successfully.',
      data: {
        fileName,
        totalLocations: parsed.totalLocations,
        totalMaterials: parsed.totalMaterials,
        uploadedRows: parsed.totalRows,
        uploadedMergedRows: parsed.mergedRows,
        selection,
        locations: parsed.locations.map((location) => ({
          storageBin: location.storageBin,
          operatorId: location.operatorId,
          operatorName:
            location.operatorId === null ? null : (valid.get(location.operatorId)?.name ?? null),
          materials: location.materials,
        })),
      },
    };
  }

  async createAudit(
    file: Express.Multer.File | undefined,
    dto: CreateCycleCountAuditDto,
    actor: CycleCountAuditActor,
  ) {
    const { fileName, parsed, selection } = await this.readSelectedUpload(file, dto);

    const auditName = (dto.auditName ?? '').trim().replace(/\s+/g, ' ');
    if (!auditName) {
      throw new BadRequestException({
        code: 'AUDIT_NAME_REQUIRED',
        message: 'Audit Name is required.',
      });
    }
    if (auditName.length > BOM_AUDIT_MAX_LENGTH.auditName) {
      throw new BadRequestException({
        code: 'AUDIT_NAME_TOO_LONG',
        message: `Audit Name must be at most ${BOM_AUDIT_MAX_LENGTH.auditName} characters.`,
      });
    }

    const binOperators = this.parseBinOperators(dto.binOperators, parsed);
    const groups = await this.resolveOperatorGroups(parsed, binOperators);

    const uploadBatchId = randomUUID();
    const audits = await this.saveAuditsWithRetry(groups, auditName, fileName, uploadBatchId, actor, selection);

    this.logger.log(
      `Cycle Count audit "${auditName}" created by ${actor.name}: ${audits.length} audit(s) ` +
        `[${audits.map((a) => `${a.auditNo} -> ${a.operatorName}`).join(', ')}], ` +
        `${parsed.totalLocations} locations, ${parsed.totalMaterials} materials`,
    );

    return {
      message:
        audits.length === 1
          ? 'Cycle Count audit created successfully.'
          : `${audits.length} Cycle Count audits created successfully (one per operator).`,
      data: {
        auditName,
        uploadBatchId,
        totalLocations: parsed.totalLocations,
        totalMaterials: parsed.totalMaterials,
        uploadedRows: parsed.totalRows,
        uploadedMergedRows: parsed.mergedRows,
        selection,
        audits,
      },
    };
  }

  private async readUpload(
    file: Express.Multer.File | undefined,
  ): Promise<{ fileName: string; parsed: BomAuditParseResult }> {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Please upload the Cycle Count audit Excel file.',
      });
    }

    const fileName = decodeUploadFileName(file.originalname || 'upload.xlsx');

    const headerAliases = await this.columnConfig.getHeaderAliases();

    let parsed: BomAuditParseResult;
    try {
      parsed = await parseBomAuditFile(
        Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer),
        fileName,
        headerAliases,
      );
    } catch (error) {
      if (error instanceof BomAuditFileError) {
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          errors: error.rowErrors.length ? error.rowErrors : undefined,
          details: error.totalRowErrors
            ? { totalRowErrors: error.totalRowErrors }
            : null,
        });
      }
      throw error;
    }

    return { fileName, parsed };
  }

  private parseBinOperators(raw: string | undefined, parsed: BomAuditParseResult): Map<string, number> {
    const result = new Map<string, number>();
    if (raw === undefined || raw.trim() === '') return result;

    const invalid = (message: string) =>
      new BadRequestException({ code: 'INVALID_BIN_OPERATORS', message });

    let list: unknown;
    try {
      list = JSON.parse(raw);
    } catch {
      throw invalid('binOperators must be a JSON list like [{"storageBin":"15-C-22","operatorId":12}].');
    }
    if (!Array.isArray(list)) {
      throw invalid('binOperators must be a JSON list like [{"storageBin":"15-C-22","operatorId":12}].');
    }

    const knownBins = new Set(parsed.locations.map((l) => l.storageBin));
    for (const item of list) {
      const storageBin =
        item && typeof item === 'object' && typeof (item as { storageBin?: unknown }).storageBin === 'string'
          ? (item as { storageBin: string }).storageBin.trim().toUpperCase()
          : '';
      const operatorId = Number((item as { operatorId?: unknown } | null)?.operatorId);
      if (!storageBin || !Number.isSafeInteger(operatorId) || operatorId <= 0 || operatorId > BOM_AUDIT_MAX_OPERATOR_ID) {
        throw invalid('Every binOperators entry needs a storageBin and a valid operatorId.');
      }
      if (!knownBins.has(storageBin)) {
        throw invalid(`Storage bin ${storageBin} is not in the uploaded file.`);
      }
      if (result.has(storageBin)) {
        throw invalid(`Storage bin ${storageBin} is listed more than once in binOperators.`);
      }
      result.set(storageBin, operatorId);
    }
    return result;
  }

  private async checkOperators(parsed: BomAuditParseResult, extraIds: number[]) {
    const result = await this.operators.checkOperatorIds([...parsed.operatorRows.keys(), ...extraIds]);
    const { notFound, notOperator } = result;

    const rowText = (id: number) => {
      const rows = parsed.operatorRows.get(id) ?? [];
      const shown = rows.slice(0, 10).join(', ');
      return rows.length > 10 ? `rows ${shown} ... (${rows.length} rows)` : `row${rows.length === 1 ? '' : 's'} ${shown}`;
    };
    const firstRow = (id: number) => parsed.operatorRows.get(id)?.[0] ?? 0;
    const fileIds = new Set(parsed.operatorRows.keys());

    const rowErrors: { rowNo: number; errors: string[] }[] = [
      ...notFound
        .filter((id) => fileIds.has(id))
        .map((id) => ({
          rowNo: firstRow(id),
          errors: [`Operator ID ${id} does not exist (${rowText(id)})`],
        })),
      ...notOperator
        .filter((u) => fileIds.has(u.id))
        .map((u) => ({
          rowNo: firstRow(u.id),
          errors: [`User ID ${u.id} (${u.name}) is not a Terminal Operator - role ${u.role}, must be USER (${rowText(u.id)})`],
        })),
    ];

    if (rowErrors.length) {
      rowErrors.sort((a, b) => a.rowNo - b.rowNo);
      throw new BadRequestException({
        code: 'INVALID_OPERATORS',
        message: `${rowErrors.length} Operator ID(s) in the file are not valid. Use the ID of a Terminal Operator (role USER).`,
        errors: rowErrors.slice(0, BOM_AUDIT_MAX_REPORTED_ERRORS),
      });
    }

    return result;
  }

  private async resolveOperatorGroups(parsed: BomAuditParseResult, binOperators: Map<string, number>) {
    const { valid } = await this.checkOperators(parsed, [...binOperators.values()]);

    const invalidChosen = [...binOperators.entries()].filter(([, id]) => !valid.has(id));
    if (invalidChosen.length) {
      throw new BadRequestException({
        code: 'INVALID_OPERATORS',
        message:
          `Operator chosen for ${invalidChosen.length} storage bin(s) is not a Terminal Operator (role USER): ` +
          invalidChosen
            .slice(0, 10)
            .map(([bin, id]) => `${bin} -> ${id}`)
            .join(', '),
      });
    }

    const unassigned = parsed.locations.filter(
      (location) => !binOperators.has(location.storageBin) && location.operatorId === null,
    );
    if (unassigned.length) {
      throw new BadRequestException({
        code: 'BINS_WITHOUT_OPERATOR',
        message:
          `${unassigned.length} storage bin(s) have no operator. Assign an operator to every storage bin, e.g. ` +
          unassigned
            .slice(0, 10)
            .map((l) => l.storageBin)
            .join(', ') +
          '.',
      });
    }

    const groups = new Map<number, { operator: { id: number; name: string }; locations: ParsedBomAuditLocation[]; firstRowNo: number }>();
    for (const location of parsed.locations) {
      const operatorId = binOperators.get(location.storageBin) ?? (location.operatorId as number);
      const operator = valid.get(operatorId)!;
      const assigned = { ...location, operatorId };
      const group = groups.get(operator.id);
      if (group) {
        group.locations.push(assigned);
        group.firstRowNo = Math.min(group.firstRowNo, location.firstRowNo);
      } else {
        groups.set(operator.id, { operator, locations: [assigned], firstRowNo: location.firstRowNo });
      }
    }
    return [...groups.values()].sort((a, b) => a.firstRowNo - b.firstRowNo);
  }

  private async saveAuditsWithRetry(
    groups: { operator: { id: number; name: string }; locations: ParsedBomAuditLocation[] }[],
    auditName: string,
    fileName: string,
    uploadBatchId: string,
    actor: CycleCountAuditActor,
    selection: CycleCountSelection,
  ): Promise<AuditSummary[]> {
    for (let attempt = 1; attempt <= MAX_AUDIT_NO_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const saved: AuditSummary[] = [];
            for (const group of groups) {
              saved.push(
                await this.saveAudit(tx, group.locations, auditName, fileName, group.operator, actor, uploadBatchId, selection),
              );
            }
            return saved;
          },
          { timeout: 60_000 },
        );
      } catch (error) {
        if (error instanceof HttpException) throw error;
        const isAuditNoClash =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          `${JSON.stringify(error.meta ?? {})} ${error.message}`.includes(
            'auditNo',
          );
        if (isAuditNoClash && attempt < MAX_AUDIT_NO_ATTEMPTS) continue;

        this.logger.error(
          `Failed to save Cycle Count audit (${fileName})`,
          error instanceof Error ? error.stack : String(error),
        );
        throw new InternalServerErrorException({
          code: 'CYCLE_COUNT_AUDIT_SAVE_FAILED',
          message: 'Failed to save the Cycle Count audit. Please try again.',
        });
      }
    }
    throw new InternalServerErrorException({
      code: 'CYCLE_COUNT_AUDIT_SAVE_FAILED',
      message: 'Failed to save the Cycle Count audit. Please try again.',
    });
  }

  private async saveAudit(
    tx: Prisma.TransactionClient,
    locations: ParsedBomAuditLocation[],
    auditName: string,
    fileName: string,
    operator: { id: number; name: string },
    actor: CycleCountAuditActor,
    uploadBatchId: string,
    selection: CycleCountSelection,
  ): Promise<AuditSummary> {
    const auditNo = await this.nextAuditNo(tx);

    const audit = await tx.cycleCountAudit.create({
      data: {
        auditNo,
        auditName,
        fileName,
        status: BOM_AUDIT_STATUS.ASSIGNED,
        operatorId: operator.id,
        operatorName: operator.name,
        totalLocations: locations.length,
        totalMaterials: locations.reduce((sum, l) => sum + l.materials.length, 0),
        createdById: actor.userId,
        createdByName: actor.name,
        uploadBatchId,
        issueFromDate: new Date(`${selection.fromDate}T00:00:00.000Z`),
        issueToDate: new Date(`${selection.toDate}T00:00:00.000Z`),
        sourceSoCount: selection.sourceSoCount,
        qualifyingSoCount: selection.qualifyingSoCount,
        sourceBinCount: selection.sourceBinCount,
        uploadedBinCount: selection.uploadedBinCount,
        matchedBinCount: selection.matchedBinCount,
      },
      select: AUDIT_SUMMARY_SELECT,
    });

    const locationRows = locations.map((location, index) => ({
      auditId: audit.id,
      storageBin: location.storageBin,
      sequenceNo: index + 1,
      expectedMaterials: location.materials.length,
    }));
    for (const chunk of this.chunk(locationRows)) {
      await tx.cycleCountAuditLocation.createMany({ data: chunk });
    }

    const savedLocations = await tx.cycleCountAuditLocation.findMany({
      where: { auditId: audit.id },
      select: { id: true, storageBin: true },
    });
    const locationIdByBin = new Map(
      savedLocations.map((l) => [l.storageBin, l.id]),
    );

    const materialRows = locations.flatMap((location) => {
      const auditLocationId = locationIdByBin.get(location.storageBin);
      if (auditLocationId === undefined) {
        throw new Error(`Location ${location.storageBin} was not saved`);
      }
      return location.materials.map((material) => ({
        auditLocationId,
        auditId: audit.id,
        materialCode: material.materialCode,
        expectedQty: material.expectedQty,
      }));
    });
    for (const chunk of this.chunk(materialRows)) {
      await tx.cycleCountAuditMaterial.createMany({ data: chunk });
    }

    return audit;
  }

  private async nextAuditNo(tx: Prisma.TransactionClient): Promise<string> {
    return nextAuditNo(tx, {
      prefix: AUDIT_NO_REGISTRY.CYCLE_COUNT.prefix,
      lockKey: AUDIT_NO_REGISTRY.CYCLE_COUNT.lockKey,
      findLastAuditNo: async (startsWith) =>
        (
          await tx.cycleCountAudit.findFirst({
            where: { auditNo: { startsWith } },
            orderBy: { auditNo: 'desc' },
            select: { auditNo: true },
          })
        )?.auditNo ?? null,
    });
  }

  private chunk<T>(rows: T[]): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < rows.length; i += BOM_AUDIT_INSERT_CHUNK_SIZE) {
      chunks.push(rows.slice(i, i + BOM_AUDIT_INSERT_CHUNK_SIZE));
    }
    return chunks;
  }

  private async readSelectedUpload(file: Express.Multer.File | undefined, dto: PreviewCycleCountAuditDto) {
    const range = cycleCountDateRange(dto.fromDate, dto.toDate);
    const { fileName, parsed: uploaded } = await this.readUpload(file);
    const source = await this.source.getBins(range.start, range.end);
    const bins = new Set(source.bins);
    const locations = uploaded.locations.filter((location) => bins.has(location.storageBin));
    if (!locations.length) {
      throw new BadRequestException({
        code: 'NO_MATCHING_STORAGE_BINS',
        message: 'No Excel storage bins match the qualifying Sales Orders for this Issue Updated Date range.',
        details: { sourceSoCount: source.sourceSoCount, qualifyingSoCount: source.qualifyingSoCount, sourceBinCount: bins.size, uploadedBinCount: uploaded.totalLocations },
      });
    }
    for (const location of locations) {
      for (const material of location.materials) {
        if (!Number.isSafeInteger(material.expectedQty) || material.expectedQty > 2_147_483_647) {
          throw new BadRequestException({ code: 'INVALID_EXPECTED_QUANTITY', message: `Combined quantity for ${location.storageBin} / ${material.materialCode} exceeds the supported whole-number range.` });
        }
      }
    }
    const ids = new Set(locations.flatMap((location) => location.operatorId === null ? [] : [location.operatorId]));
    const parsed: BomAuditParseResult = {
      ...uploaded,
      locations,
      operatorRows: new Map([...uploaded.operatorRows].filter(([id]) => ids.has(id))),
      totalLocations: locations.length,
      totalMaterials: locations.reduce((sum, location) => sum + location.materials.length, 0),
    };
    const selection: CycleCountSelection = {
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      sourceSoCount: source.sourceSoCount,
      qualifyingSoCount: source.qualifyingSoCount,
      sourceBinCount: bins.size,
      uploadedBinCount: uploaded.totalLocations,
      matchedBinCount: locations.length,
      excludedBinCount: uploaded.totalLocations - locations.length,
    };
    return { fileName, parsed, selection };
  }

  async findAll(query: QueryBomAuditDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const scope: Prisma.CycleCountAuditWhereInput = {};
    if (query.search) {
      scope.OR = [
        ...['auditNo', 'auditName', 'fileName', 'operatorName'].map((field) => ({ [field]: { contains: query.search, mode: 'insensitive' as const } })),
        { locations: { some: { storageBin: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    if (query.fromDate || query.toDate) {
      if (query.fromDate) parseCycleCountDate(query.fromDate);
      if (query.toDate) parseCycleCountDate(query.toDate);
      const from = query.fromDate ? getIstTimestampRange(query.fromDate) : undefined;
      const to = query.toDate ? getIstTimestampRange(query.toDate) : undefined;
      if (from && to && from.startOfDay >= to.endOfDay) {
        throw new BadRequestException('fromDate must be on or before toDate.');
      }
      scope.createdAt = { ...(from ? { gte: from.startOfDay } : {}), ...(to ? { lt: to.endOfDay } : {}) };
    }
    const where = { ...scope, ...(query.status ? { status: query.status } : {}) };
    const groupedStatuses = this.prisma.cycleCountAudit.groupBy({
      by: ['status'],
      orderBy: { status: 'asc' },
      where: scope,
      _count: { _all: true },
    });
    const [total, audits, groups] = await this.prisma.$transaction([
      this.prisma.cycleCountAudit.count({ where }),
      this.prisma.cycleCountAudit.findMany({ where, select: AUDIT_LIST_SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      groupedStatuses,
    ]);
    const statusCounts = { ASSIGNED: 0, IN_PROGRESS: 0, RECONCILIATION_PENDING: 0, CLOSED: 0 };
    for (const group of groups) {
      if (Object.prototype.hasOwnProperty.call(statusCounts, group.status)) {
        statusCounts[group.status as keyof typeof statusCounts] = group._count._all;
      }
    }
    return {
      message: 'Cycle Count audits fetched successfully.',
      data: audits.map(({ locations, ...audit }) => ({ ...audit, storageBinCount: locations.length, storageBins: locations, uploadedLocations: 0 })),
      statusCounts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const audit = await this.prisma.cycleCountAudit.findUnique({
      where: { id },
      include: { locations: { orderBy: { sequenceNo: 'asc' }, include: { materials: { orderBy: { materialCode: 'asc' } } } } },
    });
    if (!audit) throw new NotFoundException({ code: 'CYCLE_COUNT_AUDIT_NOT_FOUND', message: 'Cycle Count audit not found.' });
    return { message: 'Cycle Count audit fetched successfully.', data: audit };
  }
}
