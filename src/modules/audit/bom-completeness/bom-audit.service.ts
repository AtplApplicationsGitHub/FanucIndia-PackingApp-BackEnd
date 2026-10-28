import {
  BadRequestException,
  ConflictException,
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
import { CreateBomAuditDto } from './dto/create-bom-audit.dto';
import { QueryBomAuditDto } from './dto/query-bom-audit.dto';
import {
  BOM_AUDIT_INSERT_CHUNK_SIZE,
  BOM_AUDIT_MAX_LENGTH,
  BOM_AUDIT_MAX_REPORTED_ERRORS,
  BOM_AUDIT_NO_LOCK_KEY,
  BOM_AUDIT_NO_PREFIX,
  BOM_AUDIT_STATUS,
} from './bom-audit.constants';
import {
  BomAuditFileError,
  BomAuditParseResult,
  ParsedBomAuditLocation,
  parseBomAuditFile,
} from './bom-audit-file.parser';
import { decodeUploadFileName } from '../shared/audit-excel.util';
import { nextAuditNo } from '../shared/audit-number.util';
import { AuditOperatorsService } from '../shared/audit-operators.service';
import { AUDIT_EDITABLE_STATUSES } from '../shared/audit.constants';

export interface BomAuditActor {
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
  downloadedAt: true,
  startedAt: true,
  completedAt: true,
  submittedAt: true,
  uploadBatchId: true,
  reportPath: true,
  reportGeneratedAt: true,
} satisfies Prisma.BomAuditSelect;

const AUDIT_LIST_SELECT = {
  ...AUDIT_SUMMARY_SELECT,
  locations: {
    select: { sequenceNo: true, storageBin: true },
    orderBy: { sequenceNo: 'asc' },
  },
} satisfies Prisma.BomAuditSelect;

type AuditSummary = Prisma.BomAuditGetPayload<{
  select: typeof AUDIT_SUMMARY_SELECT;
}>;

const MAX_AUDIT_NO_ATTEMPTS = 3;

@Injectable()
export class BomAuditService {
  private readonly logger = new Logger(BomAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly operators: AuditOperatorsService,
  ) {}

  async createAudit(
    file: Express.Multer.File | undefined,
    dto: CreateBomAuditDto,
    actor: BomAuditActor,
  ) {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Please upload the BOM audit Excel file.',
      });
    }

    const fileName = decodeUploadFileName(file.originalname || 'upload.xlsx');

    let parsed: BomAuditParseResult;
    try {
      parsed = await parseBomAuditFile(
        Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer),
        fileName,
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

    const groups = await this.resolveOperatorGroups(parsed);

    const uploadBatchId = randomUUID();
    const audits = await this.saveAuditsWithRetry(groups, auditName, fileName, uploadBatchId, actor);

    this.logger.log(
      `BOM audit "${auditName}" created by ${actor.name}: ${audits.length} audit(s) ` +
        `[${audits.map((a) => `${a.auditNo} -> ${a.operatorName}`).join(', ')}], ` +
        `${parsed.totalLocations} locations, ${parsed.totalMaterials} materials`,
    );

    return {
      message:
        audits.length === 1
          ? 'BOM audit created successfully.'
          : `${audits.length} BOM audits created successfully (one per operator).`,
      data: {
        auditName,
        uploadBatchId,
        totalLocations: parsed.totalLocations,
        totalMaterials: parsed.totalMaterials,
        totalRows: parsed.totalRows,
        mergedRows: parsed.mergedRows,
        audits,
      },
    };
  }

  private async resolveOperatorGroups(parsed: BomAuditParseResult) {
    const { valid, notFound, notOperator } = await this.operators.checkOperatorIds([
      ...parsed.operatorRows.keys(),
    ]);

    const rowText = (id: number) => {
      const rows = parsed.operatorRows.get(id) ?? [];
      const shown = rows.slice(0, 10).join(', ');
      return rows.length > 10 ? `rows ${shown} ... (${rows.length} rows)` : `row${rows.length === 1 ? '' : 's'} ${shown}`;
    };
    const firstRow = (id: number) => parsed.operatorRows.get(id)?.[0] ?? 0;

    const rowErrors: { rowNo: number; errors: string[] }[] = [
      ...notFound.map((id) => ({
        rowNo: firstRow(id),
        errors: [`Operator ID ${id} does not exist (${rowText(id)})`],
      })),
      ...notOperator.map((u) => ({
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

    const groups = new Map<number, { operator: { id: number; name: string }; locations: ParsedBomAuditLocation[]; firstRowNo: number }>();
    for (const location of parsed.locations) {
      const operator = valid.get(location.operatorId)!;
      const group = groups.get(operator.id);
      if (group) {
        group.locations.push(location);
        group.firstRowNo = Math.min(group.firstRowNo, location.firstRowNo);
      } else {
        groups.set(operator.id, { operator, locations: [location], firstRowNo: location.firstRowNo });
      }
    }
    return [...groups.values()].sort((a, b) => a.firstRowNo - b.firstRowNo);
  }

  private async saveAuditsWithRetry(
    groups: { operator: { id: number; name: string }; locations: ParsedBomAuditLocation[] }[],
    auditName: string,
    fileName: string,
    uploadBatchId: string,
    actor: BomAuditActor,
  ): Promise<AuditSummary[]> {
    for (let attempt = 1; attempt <= MAX_AUDIT_NO_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const saved: AuditSummary[] = [];
            for (const group of groups) {
              saved.push(
                await this.saveAudit(tx, group.locations, auditName, fileName, group.operator, actor, uploadBatchId),
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
          `Failed to save BOM audit (${fileName})`,
          error instanceof Error ? error.stack : String(error),
        );
        throw new InternalServerErrorException({
          code: 'BOM_AUDIT_SAVE_FAILED',
          message: 'Failed to save the BOM audit. Please try again.',
        });
      }
    }
    throw new InternalServerErrorException({
      code: 'BOM_AUDIT_SAVE_FAILED',
      message: 'Failed to save the BOM audit. Please try again.',
    });
  }

  private async saveAudit(
    tx: Prisma.TransactionClient,
    locations: ParsedBomAuditLocation[],
    auditName: string,
    fileName: string,
    operator: { id: number; name: string },
    actor: BomAuditActor,
    uploadBatchId: string,
  ): Promise<AuditSummary> {
    const auditNo = await this.nextAuditNo(tx);

    const audit = await tx.bomAudit.create({
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
      await tx.bomAuditLocation.createMany({ data: chunk });
    }

    const savedLocations = await tx.bomAuditLocation.findMany({
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
      await tx.bomAuditMaterial.createMany({ data: chunk });
    }

    return audit;
  }

  private async nextAuditNo(tx: Prisma.TransactionClient): Promise<string> {
    return nextAuditNo(tx, {
      prefix: BOM_AUDIT_NO_PREFIX,
      lockKey: BOM_AUDIT_NO_LOCK_KEY,
      findLastAuditNo: async (startsWith) =>
        (
          await tx.bomAudit.findFirst({
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

  async getOperators() {
    return this.operators.getOperators();
  }

  async findAll(query: QueryBomAuditDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.BomAuditWhereInput = {};

    if (query.status) where.status = query.status;

    if (query.search) {
      where.OR = [
        { auditNo: { contains: query.search, mode: 'insensitive' } },
        { auditName: { contains: query.search, mode: 'insensitive' } },
        { fileName: { contains: query.search, mode: 'insensitive' } },
        { operatorName: { contains: query.search, mode: 'insensitive' } },
        { locations: { some: { storageBin: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    if (query.fromDate || query.toDate) {
      const from = query.fromDate
        ? getIstTimestampRange(query.fromDate)
        : undefined;
      const to = query.toDate ? getIstTimestampRange(query.toDate) : undefined;
      if (from && to && from.startOfDay >= to.endOfDay) {
        throw new BadRequestException({
          code: 'INVALID_DATE_RANGE',
          message: 'fromDate must be on or before toDate.',
        });
      }
      where.createdAt = {
        ...(from ? { gte: from.startOfDay } : {}),
        ...(to ? { lt: to.endOfDay } : {}),
      };
    }

    const [total, audits] = await this.prisma.$transaction([
      this.prisma.bomAudit.count({ where }),
      this.prisma.bomAudit.findMany({
        where,
        select: AUDIT_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      message: 'BOM audits fetched successfully.',
      data: audits.map(({ locations, ...audit }) => ({
        ...audit,
        storageBinCount: locations.length,
        storageBins: locations,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const audit = await this.prisma.bomAudit.findUnique({
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
            expectedMaterials: true,
            materials: {
              where: { isUnexpected: false },
              orderBy: { materialCode: 'asc' },
              select: { id: true, materialCode: true, expectedQty: true },
            },
          },
        },
      },
    });

    if (!audit) {
      throw new NotFoundException({
        code: 'BOM_AUDIT_NOT_FOUND',
        message: `BOM audit with ID ${id} not found.`,
      });
    }

    return { message: 'BOM audit fetched successfully.', data: audit };
  }

  async reassign(id: number, operatorId: number, actor: BomAuditActor) {
    const audit = await this.getAuditOrThrow(id);
    this.assertEditable(audit.status, 're-assigned');

    const operator = await this.operators.getOperatorOrThrow(operatorId);
    if (operator.id === audit.operatorId) {
      return {
        message: `BOM audit is already assigned to ${operator.name}.`,
        data: await this.prisma.bomAudit.findUniqueOrThrow({ where: { id }, select: AUDIT_SUMMARY_SELECT }),
      };
    }

    const result = await this.prisma.bomAudit.updateMany({
      where: { id, status: BOM_AUDIT_STATUS.ASSIGNED },
      data: { operatorId: operator.id, operatorName: operator.name },
    });
    if (result.count === 0) {
      const latest = await this.getAuditOrThrow(id);
      this.assertEditable(latest.status, 're-assigned');
    }

    const updated = await this.prisma.bomAudit.findUniqueOrThrow({
      where: { id },
      select: AUDIT_SUMMARY_SELECT,
    });
    this.logger.log(
      `BOM audit ${updated.auditNo} re-assigned by ${actor.name}: ${audit.operatorName} (${audit.operatorId}) -> ${operator.name} (${operator.id})`,
    );
    return { message: `BOM audit re-assigned to ${operator.name}.`, data: updated };
  }

  async remove(id: number, actor: BomAuditActor) {
    const audit = await this.getAuditOrThrow(id);
    this.assertEditable(audit.status, 'deleted');

    const result = await this.prisma.bomAudit.deleteMany({
      where: { id, status: BOM_AUDIT_STATUS.ASSIGNED },
    });
    if (result.count === 0) {
      const latest = await this.getAuditOrThrow(id);
      this.assertEditable(latest.status, 'deleted');
    }

    this.logger.log(`BOM audit ${audit.auditNo} (${audit.auditName}, ${audit.operatorName}) deleted permanently by ${actor.name}`);
    return {
      message: `BOM audit ${audit.auditNo} deleted permanently.`,
      data: { id: audit.id, auditNo: audit.auditNo },
    };
  }

  private async getAuditOrThrow(id: number) {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id },
      select: { id: true, auditNo: true, auditName: true, status: true, operatorId: true, operatorName: true },
    });
    if (!audit) {
      throw new NotFoundException({
        code: 'BOM_AUDIT_NOT_FOUND',
        message: `BOM audit with ID ${id} not found.`,
      });
    }
    return audit;
  }

  private assertEditable(status: string, action: 're-assigned' | 'deleted') {
    if (!(AUDIT_EDITABLE_STATUSES as string[]).includes(status)) {
      throw new ConflictException({
        code: action === 'deleted' ? 'BOM_AUDIT_NOT_DELETABLE' : 'BOM_AUDIT_NOT_REASSIGNABLE',
        message: `This audit can no longer be ${action}: the operator has already downloaded it (status ${status}). Only ASSIGNED audits can be ${action}.`,
      });
    }
  }
}
