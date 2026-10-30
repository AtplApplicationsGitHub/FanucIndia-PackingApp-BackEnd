import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';
import {
  BOM_AUDIT_INSERT_CHUNK_SIZE,
  BOM_AUDIT_LINE_STATUS,
  BOM_AUDIT_MAX_SUBMIT_LINES,
  BOM_AUDIT_OPERATOR_OPEN_STATUSES,
  BOM_AUDIT_STATUS,
  BOM_AUDIT_SUBMIT_TX_TIMEOUT_MS,
  BOM_AUDIT_UPDATE_CHUNK_SIZE,
} from './bom-audit.constants';
import { cleanText } from '../shared/audit-excel.util';
import { BomAuditReportService } from './bom-audit-report.service';
import {
  StartBomAuditDto,
  SubmitBomAuditDto,
} from './dto/mobile-bom-audit.dto';

export interface BomAuditOperator {
  userId: number;
  name: string;
}

const MOBILE_TASK_SELECT = {
  id: true,
  auditNo: true,
  auditName: true,
  status: true,
  createdAt: true,
  totalLocations: true,
  totalMaterials: true,
} satisfies Prisma.BomAuditSelect;

const SUBMITTABLE_STATUSES: string[] = [BOM_AUDIT_STATUS.IN_PROGRESS];

interface SubmitCounts {
  valid: number;
  mismatch: number;
  missing: number;
  unexpected: number;
}

interface MaterialResult {
  id: number;
  actualQty: number;
  lineStatus: string;
  lastScannedAt: Date | null;
}

@Injectable()
export class BomAuditMobileService {
  private readonly logger = new Logger(BomAuditMobileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: BomAuditReportService,
  ) {}

  async myTasks(operator: BomAuditOperator) {
    const tasks = await this.prisma.bomAudit.findMany({
      where: {
        operatorId: operator.userId,
        status: { in: BOM_AUDIT_OPERATOR_OPEN_STATUSES },
      },
      select: MOBILE_TASK_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'BOM audit tasks fetched successfully.',
      count: tasks.length,
      data: tasks,
    };
  }

  async download(id: number, operator: BomAuditOperator) {
    const audit = await this.getOwnAudit(id, operator);

    if (!BOM_AUDIT_OPERATOR_OPEN_STATUSES.includes(audit.status)) {
      throw this.alreadySubmitted(audit.status);
    }

    if (audit.status === BOM_AUDIT_STATUS.ASSIGNED) {
      const result = await this.prisma.bomAudit.updateMany({
        where: { id, status: BOM_AUDIT_STATUS.ASSIGNED },
        data: { status: BOM_AUDIT_STATUS.IN_PROGRESS, downloadedAt: new Date() },
      });
      if (result.count === 0) {
        const latest = await this.getOwnAudit(id, operator);
        if (!BOM_AUDIT_OPERATOR_OPEN_STATUSES.includes(latest.status)) {
          throw this.alreadySubmitted(latest.status);
        }
      }
    }

    const detail = await this.prisma.bomAudit.findUniqueOrThrow({
      where: { id },
      select: {
        ...MOBILE_TASK_SELECT,
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

    if (audit.status === BOM_AUDIT_STATUS.ASSIGNED) {
      this.logger.log(`BOM audit ${detail.auditNo} downloaded by ${operator.name}`);
    }

    const mappingByCode = await this.findMappingBarcodes(
      detail.locations.flatMap((location) => location.materials.map((m) => m.materialCode)),
    );
    const data = {
      ...detail,
      locations: detail.locations.map((location) => ({
        ...location,
        materials: location.materials.map((material) => ({
          ...material,
          mappingBarcode: mappingByCode.get(material.materialCode.toUpperCase()) ?? null,
        })),
      })),
    };

    return { message: 'BOM audit downloaded successfully.', data };
  }

  private async findMappingBarcodes(materialCodes: string[]): Promise<Map<string, string>> {
    const codes = [...new Set(materialCodes.map((code) => code.trim()).filter(Boolean))];
    const result = new Map<string, string>();
    if (codes.length === 0) return result;

    const rows = await this.prisma.materialBarcode.findMany({
      where: { erpCode: { in: codes, mode: 'insensitive' } },
      select: { erpCode: true, mappingBarcode: true },
    });
    for (const row of rows) {
      const barcode = row.mappingBarcode?.trim();
      const key = row.erpCode.trim().toUpperCase();
      if (barcode && !result.has(key)) result.set(key, barcode);
    }
    return result;
  }

  async start(id: number, dto: StartBomAuditDto, operator: BomAuditOperator) {
    const audit = await this.getOwnAudit(id, operator);

    if (!BOM_AUDIT_OPERATOR_OPEN_STATUSES.includes(audit.status)) {
      throw this.alreadySubmitted(audit.status);
    }

    if (audit.status === BOM_AUDIT_STATUS.IN_PROGRESS && audit.startedAt) {
      return {
        message: 'BOM audit already started.',
        data: { id: audit.id, auditNo: audit.auditNo, status: audit.status },
      };
    }

    const startedAt = this.toDate(dto.startedAt, 'startedAt');
    const result = await this.prisma.bomAudit.updateMany({
      where: {
        id,
        operatorId: operator.userId,
        status: { in: [BOM_AUDIT_STATUS.ASSIGNED, BOM_AUDIT_STATUS.IN_PROGRESS] },
        startedAt: null,
      },
      data: {
        status: BOM_AUDIT_STATUS.IN_PROGRESS,
        startedAt,
        ...(audit.downloadedAt ? {} : { downloadedAt: startedAt }),
      },
    });

    if (result.count === 0) {
      const latest = await this.getOwnAudit(id, operator);
      if (latest.status !== BOM_AUDIT_STATUS.IN_PROGRESS) {
        throw this.alreadySubmitted(latest.status);
      }
    } else {
      this.logger.log(`BOM audit ${audit.auditNo} started by ${operator.name}`);
    }

    return {
      message: 'BOM audit started successfully.',
      data: { id: audit.id, auditNo: audit.auditNo, status: BOM_AUDIT_STATUS.IN_PROGRESS },
    };
  }

  async submit(id: number, dto: SubmitBomAuditDto, operator: BomAuditOperator) {
    const startedAt = this.toDate(dto.startedAt, 'startedAt');
    const completedAt = this.toDate(dto.completedAt, 'completedAt');

    const totalLines = dto.locations.reduce((sum, l) => sum + l.materials.length, 0);
    if (totalLines > BOM_AUDIT_MAX_SUBMIT_LINES) {
      throw new BadRequestException({
        code: 'BOM_SUBMIT_TOO_LARGE',
        message: `Too many material lines (${totalLines}). Maximum is ${BOM_AUDIT_MAX_SUBMIT_LINES}.`,
      });
    }

    const outcome = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "BomAudit" WHERE "id" = ${id} FOR UPDATE`;

        const audit = await tx.bomAudit.findUnique({
          where: { id },
          select: {
            id: true,
            auditNo: true,
            status: true,
            operatorId: true,
            startedAt: true,
            clientSubmissionId: true,
          },
        });
        this.assertOwnAudit(id, audit, operator);

        if (audit.clientSubmissionId) {
          if (audit.clientSubmissionId === dto.clientSubmissionId) {
            return { audit, alreadySaved: true, counts: null as SubmitCounts | null };
          }
          throw this.alreadySubmitted(audit.status);
        }

        if (!SUBMITTABLE_STATUSES.includes(audit.status)) {
          if (audit.status === BOM_AUDIT_STATUS.ASSIGNED) {
            throw new ConflictException({
              code: 'BOM_AUDIT_NOT_DOWNLOADED',
              message: 'This audit has not been downloaded to the handheld yet.',
            });
          }
          throw this.alreadySubmitted(audit.status);
        }

        const plan = await this.buildSubmitPlan(tx, id, dto);

        for (let i = 0; i < plan.materials.length; i += BOM_AUDIT_UPDATE_CHUNK_SIZE) {
          const chunk = plan.materials.slice(i, i + BOM_AUDIT_UPDATE_CHUNK_SIZE);
          await tx.$executeRaw`
            UPDATE "BomAuditMaterial" AS m
            SET "actualQty" = v."actualQty",
                "lineStatus" = v."lineStatus",
                "lastScannedAt" = v."lastScannedAt",
                "updatedAt" = NOW()
            FROM (VALUES ${Prisma.join(
              chunk.map(
                (r) =>
                  Prisma.sql`(${r.id}::int, ${r.actualQty}::int, ${r.lineStatus}::varchar, ${r.lastScannedAt}::timestamptz)`,
              ),
            )}) AS v("id", "actualQty", "lineStatus", "lastScannedAt")
            WHERE m."id" = v."id" AND m."auditId" = ${id}`;
        }

        for (let i = 0; i < plan.unexpected.length; i += BOM_AUDIT_INSERT_CHUNK_SIZE) {
          await tx.bomAuditMaterial.createMany({
            data: plan.unexpected.slice(i, i + BOM_AUDIT_INSERT_CHUNK_SIZE),
          });
        }

        for (let i = 0; i < plan.locations.length; i += BOM_AUDIT_UPDATE_CHUNK_SIZE) {
          const chunk = plan.locations.slice(i, i + BOM_AUDIT_UPDATE_CHUNK_SIZE);
          await tx.$executeRaw`
            UPDATE "BomAuditLocation" AS l
            SET "verifiedAt" = v."verifiedAt", "updatedAt" = NOW()
            FROM (VALUES ${Prisma.join(
              chunk.map((r) => Prisma.sql`(${r.id}::int, ${r.verifiedAt}::timestamptz)`),
            )}) AS v("id", "verifiedAt")
            WHERE l."id" = v."id" AND l."auditId" = ${id}`;
        }

        const updated = await tx.bomAudit.update({
          where: { id },
          data: {
            status: BOM_AUDIT_STATUS.RECONCILIATION_PENDING,
            startedAt: audit.startedAt ?? startedAt,
            completedAt,
            submittedAt: new Date(),
            clientSubmissionId: dto.clientSubmissionId,
          },
          select: { id: true, auditNo: true, status: true, operatorId: true, startedAt: true, clientSubmissionId: true },
        });

        return { audit: updated, alreadySaved: false, counts: plan.counts as SubmitCounts | null };
      },
      { timeout: BOM_AUDIT_SUBMIT_TX_TIMEOUT_MS, maxWait: 10_000 },
    );

    if (outcome.alreadySaved) {
      this.logger.log(`BOM audit ${outcome.audit.auditNo}: repeated submit ignored (already saved)`);
    } else {
      const c = outcome.counts;
      this.logger.log(
        `BOM audit ${outcome.audit.auditNo} submitted by ${operator.name}: ` +
          `valid ${c?.valid}, mismatch ${c?.mismatch}, missing ${c?.missing}, unexpected ${c?.unexpected}`,
      );
      this.reports.generateInBackground(outcome.audit.id);
    }

    return {
      message: outcome.alreadySaved
        ? 'BOM audit was already submitted.'
        : 'BOM audit submitted successfully.',
      data: {
        id: outcome.audit.id,
        auditNo: outcome.audit.auditNo,
        status: BOM_AUDIT_STATUS.RECONCILIATION_PENDING,
      },
    };
  }

  private async buildSubmitPlan(tx: Prisma.TransactionClient, auditId: number, dto: SubmitBomAuditDto) {
    const dbLocations = await tx.bomAuditLocation.findMany({
      where: { auditId },
      select: {
        id: true,
        storageBin: true,
        materials: {
          where: { isUnexpected: false },
          select: { id: true, materialCode: true, expectedQty: true },
        },
      },
    });
    const locationsById = new Map(dbLocations.map((l) => [l.id, l]));

    const errors: string[] = [];
    const addError = (message: string) => {
      if (errors.length < 50) errors.push(message);
    };

    const seenLocations = new Set<number>();
    for (const loc of dto.locations) {
      if (!locationsById.has(loc.locationId)) addError(`Location ${loc.locationId} does not belong to this audit.`);
      else if (seenLocations.has(loc.locationId)) addError(`Location ${loc.locationId} is sent more than once.`);
      seenLocations.add(loc.locationId);
    }
    const missingLocations = dbLocations.filter((l) => !seenLocations.has(l.id));
    if (missingLocations.length) {
      addError(
        `${missingLocations.length} location(s) are missing, e.g. ${missingLocations
          .slice(0, 5)
          .map((l) => l.storageBin)
          .join(', ')}.`,
      );
    }
    if (errors.length) throw this.invalidSubmit(errors);

    const materials: MaterialResult[] = [];
    const unexpected: Prisma.BomAuditMaterialCreateManyInput[] = [];
    const locations: { id: number; verifiedAt: Date }[] = [];
    const counts: SubmitCounts = { valid: 0, mismatch: 0, missing: 0, unexpected: 0 };

    for (const loc of dto.locations) {
      const dbLoc = locationsById.get(loc.locationId)!;
      locations.push({ id: dbLoc.id, verifiedAt: this.toDate(loc.verifiedAt, 'verifiedAt') });

      const expectedById = new Map(dbLoc.materials.map((m) => [m.id, m]));
      const expectedCodes = new Set(dbLoc.materials.map((m) => m.materialCode));
      const seenMaterialIds = new Set<number>();
      const seenUnexpectedCodes = new Set<string>();

      for (const line of loc.materials) {
        const code = cleanText(line.materialCode).toUpperCase();
        const lastScannedAt = line.lastScannedAt ? this.toDate(line.lastScannedAt, 'lastScannedAt') : null;

        if (line.materialId !== undefined && line.materialId !== null) {
          const expected = expectedById.get(line.materialId);
          if (!expected) {
            addError(`${dbLoc.storageBin}: material ${line.materialId} does not belong to this location.`);
            continue;
          }
          if (seenMaterialIds.has(expected.id)) {
            addError(`${dbLoc.storageBin}: ${expected.materialCode} is sent more than once.`);
            continue;
          }
          seenMaterialIds.add(expected.id);
          if (code !== expected.materialCode) {
            addError(`${dbLoc.storageBin}: material ${line.materialId} is ${expected.materialCode}, not ${code}.`);
            continue;
          }

          const lineStatus =
            line.actualQty === expected.expectedQty
              ? BOM_AUDIT_LINE_STATUS.VALID
              : line.actualQty === 0
                ? BOM_AUDIT_LINE_STATUS.MISSING
                : BOM_AUDIT_LINE_STATUS.MISMATCH;
          if (lineStatus === BOM_AUDIT_LINE_STATUS.VALID) counts.valid++;
          else if (lineStatus === BOM_AUDIT_LINE_STATUS.MISSING) counts.missing++;
          else counts.mismatch++;

          materials.push({ id: expected.id, actualQty: line.actualQty, lineStatus, lastScannedAt });
        } else {
          if (!code) {
            addError(`${dbLoc.storageBin}: an unexpected material has an empty code.`);
            continue;
          }
          if (expectedCodes.has(code)) {
            addError(`${dbLoc.storageBin}: ${code} is an expected material - send it with its materialId.`);
            continue;
          }
          if (seenUnexpectedCodes.has(code)) {
            addError(`${dbLoc.storageBin}: unexpected material ${code} is sent more than once.`);
            continue;
          }
          seenUnexpectedCodes.add(code);
          if (line.actualQty < 1) continue;

          counts.unexpected++;
          unexpected.push({
            auditId,
            auditLocationId: dbLoc.id,
            materialCode: code,
            expectedQty: 0,
            actualQty: line.actualQty,
            lineStatus: BOM_AUDIT_LINE_STATUS.UNEXPECTED,
            isUnexpected: true,
            lastScannedAt,
          });
        }
      }

      const notSent = dbLoc.materials.filter((m) => !seenMaterialIds.has(m.id));
      if (notSent.length) {
        addError(
          `${dbLoc.storageBin}: ${notSent.length} expected material(s) are missing in the request, e.g. ${notSent
            .slice(0, 3)
            .map((m) => m.materialCode)
            .join(', ')}.`,
        );
      }
    }

    if (errors.length) throw this.invalidSubmit(errors);

    return { materials, unexpected, locations, counts };
  }

  private async getOwnAudit(id: number, operator: BomAuditOperator) {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id },
      select: { id: true, auditNo: true, status: true, operatorId: true, downloadedAt: true, startedAt: true },
    });
    this.assertOwnAudit(id, audit, operator);
    return audit;
  }

  private assertOwnAudit<T extends { status: string; operatorId: number }>(
    id: number,
    audit: T | null,
    operator: BomAuditOperator,
  ): asserts audit is T {
    if (!audit) {
      throw new NotFoundException({
        code: 'BOM_AUDIT_NOT_FOUND',
        message: 'Audit not found. It may have been deleted.',
      });
    }
    if (audit.operatorId !== operator.userId) {
      throw new ForbiddenException({
        code: 'BOM_AUDIT_NOT_ASSIGNED_TO_YOU',
        message: 'This audit is not assigned to you.',
      });
    }
  }

  private alreadySubmitted(status: string) {
    return new ConflictException({
      code: 'BOM_AUDIT_ALREADY_SUBMITTED',
      message: `This audit is already submitted and can no longer be changed (status ${status}).`,
    });
  }

  private invalidSubmit(errors: string[]) {
    return new BadRequestException({
      code: 'BOM_SUBMIT_INVALID',
      message: 'The submitted audit results do not match the audit.',
      errors,
    });
  }

  private toDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({ code: 'INVALID_DATE', message: `${field} is not a valid date.` });
    }
    const now = Date.now();
    return date.getTime() > now + 24 * 60 * 60 * 1000 ? new Date(now) : date;
  }
}