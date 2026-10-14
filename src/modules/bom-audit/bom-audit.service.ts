import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { getIstTimestampRange } from '../../common/utils/date-only.util';
import { CreateBomAuditDto } from './dto/create-bom-audit.dto';
import { QueryBomAuditDto } from './dto/query-bom-audit.dto';
import {
  BOM_AUDIT_INSERT_CHUNK_SIZE,
  BOM_AUDIT_NO_DIGITS,
  BOM_AUDIT_NO_LOCK_KEY,
  BOM_AUDIT_NO_PREFIX,
  BOM_AUDIT_STATUS,
} from './bom-audit.constants';
import {
  BomAuditFileError,
  BomAuditParseResult,
  decodeUploadFileName,
  parseBomAuditFile,
} from './bom-audit-file.parser';

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
  cancelledAt: true,
  cancelledByName: true,
} satisfies Prisma.BomAuditSelect;

type AuditSummary = Prisma.BomAuditGetPayload<{
  select: typeof AUDIT_SUMMARY_SELECT;
}>;

const MAX_AUDIT_NO_ATTEMPTS = 3;

@Injectable()
export class BomAuditService {
  private readonly logger = new Logger(BomAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    const operator = await this.prisma.user.findUnique({
      where: { id: dto.operatorId },
      select: { id: true, name: true, role: true },
    });
    if (!operator) {
      throw new BadRequestException({
        code: 'OPERATOR_NOT_FOUND',
        message: 'Selected operator does not exist.',
      });
    }
    if (operator.role !== 'USER') {
      throw new BadRequestException({
        code: 'INVALID_OPERATOR',
        message: 'Selected user is not an operator (USER role).',
      });
    }

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

    const audit = await this.saveAuditWithRetry(
      parsed,
      dto,
      fileName,
      operator,
      actor,
    );

    this.logger.log(
      `BOM audit ${audit.auditNo} (${audit.auditName}) created by ${actor.name}: ${parsed.totalLocations} locations, ` +
        `${parsed.totalMaterials} materials, operator ${operator.name}`,
    );

    return {
      message: 'BOM audit created successfully.',
      data: {
        ...audit,
        totalRows: parsed.totalRows,
        mergedRows: parsed.mergedRows,
      },
    };
  }

  private async saveAuditWithRetry(
    parsed: BomAuditParseResult,
    dto: CreateBomAuditDto,
    fileName: string,
    operator: { id: number; name: string },
    actor: BomAuditActor,
  ): Promise<AuditSummary> {
    for (let attempt = 1; attempt <= MAX_AUDIT_NO_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          (tx) => this.saveAudit(tx, parsed, dto, fileName, operator, actor),
          { timeout: 60_000 },
        );
      } catch (error) {
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
    parsed: BomAuditParseResult,
    dto: CreateBomAuditDto,
    fileName: string,
    operator: { id: number; name: string },
    actor: BomAuditActor,
  ): Promise<AuditSummary> {
    const auditNo = await this.nextAuditNo(tx);

    const audit = await tx.bomAudit.create({
      data: {
        auditNo,
        auditName: dto.auditName,
        fileName,
        status: BOM_AUDIT_STATUS.ASSIGNED,
        operatorId: operator.id,
        operatorName: operator.name,
        totalLocations: parsed.totalLocations,
        totalMaterials: parsed.totalMaterials,
        createdById: actor.userId,
        createdByName: actor.name,
      },
      select: AUDIT_SUMMARY_SELECT,
    });

    const locationRows = parsed.locations.map((location, index) => ({
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

    const materialRows = parsed.locations.flatMap((location) => {
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
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOM_AUDIT_NO_LOCK_KEY}::bigint)`;

    const year = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
    }).format(new Date());
    const prefix = `${BOM_AUDIT_NO_PREFIX}-${year}-`;

    const last = await tx.bomAudit.findFirst({
      where: { auditNo: { startsWith: prefix } },
      orderBy: { auditNo: 'desc' },
      select: { auditNo: true },
    });
    const lastNumber = last ? Number(last.auditNo.slice(prefix.length)) : 0;
    const next = (Number.isFinite(lastNumber) ? lastNumber : 0) + 1;
    return `${prefix}${String(next).padStart(BOM_AUDIT_NO_DIGITS, '0')}`;
  }

  private chunk<T>(rows: T[]): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < rows.length; i += BOM_AUDIT_INSERT_CHUNK_SIZE) {
      chunks.push(rows.slice(i, i + BOM_AUDIT_INSERT_CHUNK_SIZE));
    }
    return chunks;
  }

  async getOperators() {
    const operators = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    return {
      message: 'Operators fetched successfully.',
      count: operators.length,
      data: operators,
    };
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
        select: AUDIT_SUMMARY_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      message: 'BOM audits fetched successfully.',
      data: audits,
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

  async cancel(id: number, actor: BomAuditActor) {
    const result = await this.prisma.bomAudit.updateMany({
      where: { id, status: BOM_AUDIT_STATUS.ASSIGNED },
      data: {
        status: BOM_AUDIT_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelledByName: actor.name,
      },
    });

    if (result.count === 0) {
      const existing = await this.prisma.bomAudit.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existing) {
        throw new NotFoundException({
          code: 'BOM_AUDIT_NOT_FOUND',
          message: `BOM audit with ID ${id} not found.`,
        });
      }
      throw new ConflictException({
        code: 'BOM_AUDIT_NOT_CANCELLABLE',
        message: `Only ASSIGNED audits can be cancelled. This audit is ${existing.status}.`,
      });
    }

    const audit = await this.prisma.bomAudit.findUniqueOrThrow({
      where: { id },
      select: AUDIT_SUMMARY_SELECT,
    });

    this.logger.log(`BOM audit ${audit.auditNo} cancelled by ${actor.name}`);

    return { message: 'BOM audit cancelled successfully.', data: audit };
  }
}
