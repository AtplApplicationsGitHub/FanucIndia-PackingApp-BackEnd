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
  CYCLE_COUNT_AUDIT_INSERT_CHUNK_SIZE,
  CYCLE_COUNT_AUDIT_LINE_STATUS,
  CYCLE_COUNT_AUDIT_MAX_SUBMIT_LINES,
  CYCLE_COUNT_AUDIT_OPERATOR_OPEN_STATUSES,
  CYCLE_COUNT_AUDIT_STATUS,
  CYCLE_COUNT_AUDIT_SUBMIT_TX_TIMEOUT_MS,
  CYCLE_COUNT_AUDIT_UPDATE_CHUNK_SIZE,
} from './cycle-count-mobile.constants';
import { cleanText } from '../shared/audit-excel.util';
import { CycleCountAuditReportService } from './cycle-count-report.service';
import {
  StartCycleCountAuditDto,
  SubmitCycleCountAuditDto,
} from './dto/mobile-cycle-count-audit.dto';

export interface CycleCountAuditOperator {
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
} satisfies Prisma.CycleCountAuditSelect;

const SUBMITTABLE_STATUSES: string[] = [CYCLE_COUNT_AUDIT_STATUS.IN_PROGRESS];

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
export class CycleCountAuditMobileService {
  private readonly logger = new Logger(CycleCountAuditMobileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: CycleCountAuditReportService,
  ) {}

  async myTasks(operator: CycleCountAuditOperator) {
    const tasks = await this.prisma.cycleCountAudit.findMany({
      where: {
        operatorId: operator.userId,
        status: { in: CYCLE_COUNT_AUDIT_OPERATOR_OPEN_STATUSES },
      },
      select: MOBILE_TASK_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Cycle Count audit tasks fetched successfully.',
      count: tasks.length,
      data: tasks,
    };
  }

  async download(id: number, operator: CycleCountAuditOperator) {
    const audit = await this.getOwnAudit(id, operator);

    if (!CYCLE_COUNT_AUDIT_OPERATOR_OPEN_STATUSES.includes(audit.status)) {
      throw this.alreadySubmitted(audit.status);
    }

    if (audit.status === CYCLE_COUNT_AUDIT_STATUS.ASSIGNED) {
      const result = await this.prisma.cycleCountAudit.updateMany({
        where: { id, operatorId: operator.userId, status: CYCLE_COUNT_AUDIT_STATUS.ASSIGNED },
        data: { status: CYCLE_COUNT_AUDIT_STATUS.IN_PROGRESS, downloadedAt: new Date() },
      });
      if (result.count === 0) {
        const latest = await this.getOwnAudit(id, operator);
        if (!CYCLE_COUNT_AUDIT_OPERATOR_OPEN_STATUSES.includes(latest.status)) {
          throw this.alreadySubmitted(latest.status);
        }
      }
    }

    const detail = await this.prisma.cycleCountAudit.findUniqueOrThrow({
      where: { id },
      select: {
        ...MOBILE_TASK_SELECT,
        operatorId: true,
        locations: {
          orderBy: { sequenceNo: 'asc' },
          select: {
            id: true,
            sequenceNo: true,
            storageBin: true,
            expectedMaterials: true,
            verifiedAt: true,
            uploadedAt: true,
            materials: {
              orderBy: [{ isUnexpected: 'asc' }, { materialCode: 'asc' }],
              select: {
                id: true,
                materialCode: true,
                expectedQty: true,
                actualQty: true,
                isUnexpected: true,
                lastScannedAt: true,
              },
            },
          },
        },
      },
    });

    this.assertOwnAudit(id, detail, operator);
    if (!CYCLE_COUNT_AUDIT_OPERATOR_OPEN_STATUSES.includes(detail.status)) throw this.alreadySubmitted(detail.status);

    if (audit.status === CYCLE_COUNT_AUDIT_STATUS.ASSIGNED) {
      this.logger.log(`Cycle Count audit ${detail.auditNo} downloaded by ${operator.name}`);
    }

    const mappingByCode = await this.findMappingBarcodes(
      detail.locations.flatMap((location) => location.materials.map((m) => m.materialCode)),
    );
    const data = {
      ...detail,
      uploadedLocations: detail.locations.filter((location) => location.uploadedAt).length,
      locations: detail.locations.map(({ materials, ...location }) => {
        const uploaded = location.uploadedAt !== null;
        return {
          ...location,
          uploaded,
          materials: materials
            .filter((material) => uploaded || !material.isUnexpected)
            .map(({ actualQty, isUnexpected, lastScannedAt, ...material }) => ({
              ...material,
              mappingBarcode: mappingByCode.get(material.materialCode.toUpperCase()) ?? null,
              ...(uploaded ? { actualQty: actualQty ?? 0, isUnexpected, lastScannedAt } : {}),
            })),
        };
      }),
    };

    return { message: 'Cycle Count audit downloaded successfully.', data };
  }

  private async findMappingBarcodes(materialCodes: string[]): Promise<Map<string, string>> {
    const codes = [...new Set(materialCodes.map((code) => code.trim()).filter(Boolean))];
    const result = new Map<string, string>();
    if (codes.length === 0) return result;

    for (let offset = 0; offset < codes.length; offset += CYCLE_COUNT_AUDIT_INSERT_CHUNK_SIZE) {
      const rows = await this.prisma.materialBarcode.findMany({
        where: { erpCode: { in: codes.slice(offset, offset + CYCLE_COUNT_AUDIT_INSERT_CHUNK_SIZE), mode: 'insensitive' } },
        select: { erpCode: true, mappingBarcode: true },
      });
      for (const row of rows) {
        const barcode = row.mappingBarcode?.trim();
        const key = row.erpCode.trim().toUpperCase();
        if (barcode && !result.has(key)) result.set(key, barcode);
      }
    }
    return result;
  }

  async start(id: number, dto: StartCycleCountAuditDto, operator: CycleCountAuditOperator) {
    const audit = await this.getOwnAudit(id, operator);

    if (!CYCLE_COUNT_AUDIT_OPERATOR_OPEN_STATUSES.includes(audit.status)) {
      throw this.alreadySubmitted(audit.status);
    }

    if (audit.status === CYCLE_COUNT_AUDIT_STATUS.IN_PROGRESS && audit.startedAt) {
      return {
        message: 'Cycle Count audit already started.',
        data: { id: audit.id, auditNo: audit.auditNo, status: audit.status },
      };
    }

    const startedAt = this.toDate(dto.startedAt, 'startedAt');
    const result = await this.prisma.cycleCountAudit.updateMany({
      where: {
        id,
        operatorId: operator.userId,
        status: { in: [CYCLE_COUNT_AUDIT_STATUS.ASSIGNED, CYCLE_COUNT_AUDIT_STATUS.IN_PROGRESS] },
        startedAt: null,
      },
      data: {
        status: CYCLE_COUNT_AUDIT_STATUS.IN_PROGRESS,
        startedAt,
        ...(audit.downloadedAt ? {} : { downloadedAt: startedAt }),
      },
    });

    if (result.count === 0) {
      const latest = await this.getOwnAudit(id, operator);
      if (latest.status !== CYCLE_COUNT_AUDIT_STATUS.IN_PROGRESS) {
        throw this.alreadySubmitted(latest.status);
      }
    } else {
      this.logger.log(`Cycle Count audit ${audit.auditNo} started by ${operator.name}`);
    }

    return {
      message: 'Cycle Count audit started successfully.',
      data: { id: audit.id, auditNo: audit.auditNo, status: CYCLE_COUNT_AUDIT_STATUS.IN_PROGRESS },
    };
  }

  async submit(id: number, dto: SubmitCycleCountAuditDto, operator: CycleCountAuditOperator) {
    const startedAt = this.toDate(dto.startedAt, 'startedAt');
    const completedAt = this.toDate(dto.completedAt, 'completedAt');

    const totalLines = dto.locations.reduce((sum, l) => sum + l.materials.length, 0);
    if (totalLines > CYCLE_COUNT_AUDIT_MAX_SUBMIT_LINES) {
      throw new BadRequestException({
        code: 'CYCLE_COUNT_SUBMIT_TOO_LARGE',
        message: `Too many material lines (${totalLines}). Maximum is ${CYCLE_COUNT_AUDIT_MAX_SUBMIT_LINES}.`,
      });
    }

    const outcome = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "CycleCountAudit" WHERE "id" = ${id} FOR UPDATE`;

        const audit = await tx.cycleCountAudit.findUnique({
          where: { id },
          select: {
            id: true,
            auditNo: true,
            status: true,
            operatorId: true,
            startedAt: true,
            clientSubmissionId: true,
            totalLocations: true,
          },
        });
        this.assertOwnAudit(id, audit, operator);

        const repeated = await tx.cycleCountAuditLocation.count({
          where: { auditId: id, uploadSubmissionId: dto.clientSubmissionId },
        });
        const isRepeat = repeated > 0 || audit.clientSubmissionId === dto.clientSubmissionId;

        if (!SUBMITTABLE_STATUSES.includes(audit.status)) {
          if (isRepeat) {
            const uploaded = await tx.cycleCountAuditLocation.count({
              where: { auditId: id, uploadedAt: { not: null } },
            });
            return this.submitOutcome(audit, [], [], true, false, null, uploaded);
          }
          if (audit.status === CYCLE_COUNT_AUDIT_STATUS.ASSIGNED) {
            throw new ConflictException({
              code: 'CYCLE_COUNT_AUDIT_NOT_DOWNLOADED',
              message: 'This audit has not been downloaded to the handheld yet.',
            });
          }
          throw this.alreadySubmitted(audit.status);
        }

        const plan = await this.buildSubmitPlan(tx, id, dto);

        if (dto.locations.length === 0 && plan.pendingAfter > 0) {
          throw new BadRequestException({
            code: 'CYCLE_COUNT_SUBMIT_NOTHING_TO_UPLOAD',
            message: 'There are no completed locations to submit.',
          });
        }

        for (let i = 0; i < plan.materials.length; i += CYCLE_COUNT_AUDIT_UPDATE_CHUNK_SIZE) {
          const chunk = plan.materials.slice(i, i + CYCLE_COUNT_AUDIT_UPDATE_CHUNK_SIZE);
          await tx.$executeRaw`
            UPDATE "CycleCountAuditMaterial" AS m
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

        for (let i = 0; i < plan.unexpected.length; i += CYCLE_COUNT_AUDIT_INSERT_CHUNK_SIZE) {
          await tx.cycleCountAuditMaterial.createMany({
            data: plan.unexpected.slice(i, i + CYCLE_COUNT_AUDIT_INSERT_CHUNK_SIZE),
          });
        }

        const uploadedAt = new Date();
        for (let i = 0; i < plan.locations.length; i += CYCLE_COUNT_AUDIT_UPDATE_CHUNK_SIZE) {
          const chunk = plan.locations.slice(i, i + CYCLE_COUNT_AUDIT_UPDATE_CHUNK_SIZE);
          await tx.$executeRaw`
            UPDATE "CycleCountAuditLocation" AS l
            SET "verifiedAt" = v."verifiedAt",
                "uploadedAt" = ${uploadedAt}::timestamptz,
                "uploadSubmissionId" = ${dto.clientSubmissionId}::varchar,
                "updatedAt" = NOW()
            FROM (VALUES ${Prisma.join(
              chunk.map((r) => Prisma.sql`(${r.id}::int, ${r.verifiedAt}::timestamptz)`),
            )}) AS v("id", "verifiedAt")
            WHERE l."id" = v."id" AND l."auditId" = ${id} AND l."uploadedAt" IS NULL`;
        }

        const finished = plan.pendingAfter === 0;
        const updated = await tx.cycleCountAudit.update({
          where: { id },
          data: finished
            ? {
                status: CYCLE_COUNT_AUDIT_STATUS.RECONCILIATION_PENDING,
                startedAt: audit.startedAt ?? startedAt,
                completedAt,
                submittedAt: new Date(),
                clientSubmissionId: dto.clientSubmissionId,
              }
            : { startedAt: audit.startedAt ?? startedAt },
          select: {
            id: true,
            auditNo: true,
            status: true,
            operatorId: true,
            startedAt: true,
            clientSubmissionId: true,
            totalLocations: true,
          },
        });

        return this.submitOutcome(
          updated,
          plan.locations.map((l) => l.id),
          plan.alreadyUploaded,
          plan.locations.length === 0 && !finished,
          finished,
          plan.counts,
          plan.totalLocations - plan.pendingAfter,
        );
      },
      { timeout: CYCLE_COUNT_AUDIT_SUBMIT_TX_TIMEOUT_MS, maxWait: 10_000 },
    );

    if (outcome.alreadySaved) {
      this.logger.log(`Cycle Count audit ${outcome.audit.auditNo}: repeated submit ignored (already saved)`);
    } else {
      const c = outcome.counts;
      this.logger.log(
        `Cycle Count audit ${outcome.audit.auditNo}: ${outcome.savedLocationIds.length} location(s) uploaded by ${operator.name} ` +
          `(${outcome.uploadedLocations}/${outcome.audit.totalLocations}): ` +
          `valid ${c?.valid}, mismatch ${c?.mismatch}, missing ${c?.missing}, unexpected ${c?.unexpected}`,
      );
      if (outcome.finished) {
        this.logger.log(`Cycle Count audit ${outcome.audit.auditNo} submitted by ${operator.name}`);
        this.reports.generateInBackground(outcome.audit.id);
      }
    }

    const status = outcome.audit.status;
    const completed = status !== CYCLE_COUNT_AUDIT_STATUS.IN_PROGRESS;

    return {
      message: outcome.alreadySaved
        ? 'These locations were already submitted.'
        : completed
          ? 'Cycle Count audit submitted successfully.'
          : `${outcome.savedLocationIds.length} location(s) submitted successfully.`,
      data: {
        id: outcome.audit.id,
        auditNo: outcome.audit.auditNo,
        status,
        completed,
        totalLocations: outcome.audit.totalLocations,
        uploadedLocations: outcome.uploadedLocations,
        pendingLocations: outcome.audit.totalLocations - outcome.uploadedLocations,
        savedLocationIds: outcome.savedLocationIds,
        alreadyUploadedLocationIds: outcome.alreadyUploadedLocationIds,
      },
    };
  }

  private submitOutcome(
    audit: { id: number; auditNo: string; status: string; totalLocations: number },
    savedLocationIds: number[],
    alreadyUploadedLocationIds: number[],
    alreadySaved: boolean,
    finished: boolean,
    counts: SubmitCounts | null,
    uploadedLocations: number,
  ) {
    return {
      audit,
      savedLocationIds,
      alreadyUploadedLocationIds,
      alreadySaved,
      finished,
      counts,
      uploadedLocations,
    };
  }

  private async buildSubmitPlan(tx: Prisma.TransactionClient, auditId: number, dto: SubmitCycleCountAuditDto) {
    const dbLocations = await tx.cycleCountAuditLocation.findMany({
      where: { auditId },
      select: {
        id: true,
        storageBin: true,
        uploadedAt: true,
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
    if (errors.length) throw this.invalidSubmit(errors);

    const alreadyUploaded = dto.locations
      .filter((loc) => locationsById.get(loc.locationId)!.uploadedAt !== null)
      .map((loc) => loc.locationId);
    const toUpload = dto.locations.filter((loc) => locationsById.get(loc.locationId)!.uploadedAt === null);
    const uploadingIds = new Set(toUpload.map((location) => location.locationId));
    const pendingAfter = dbLocations.filter(
      (location) => location.uploadedAt === null && !uploadingIds.has(location.id),
    ).length;

    const materials: MaterialResult[] = [];
    const unexpected: Prisma.CycleCountAuditMaterialCreateManyInput[] = [];
    const locations: { id: number; verifiedAt: Date }[] = [];
    const counts: SubmitCounts = { valid: 0, mismatch: 0, missing: 0, unexpected: 0 };

    for (const loc of toUpload) {
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
              ? CYCLE_COUNT_AUDIT_LINE_STATUS.VALID
              : line.actualQty === 0
                ? CYCLE_COUNT_AUDIT_LINE_STATUS.MISSING
                : CYCLE_COUNT_AUDIT_LINE_STATUS.MISMATCH;
          if (lineStatus === CYCLE_COUNT_AUDIT_LINE_STATUS.VALID) counts.valid++;
          else if (lineStatus === CYCLE_COUNT_AUDIT_LINE_STATUS.MISSING) counts.missing++;
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
            lineStatus: CYCLE_COUNT_AUDIT_LINE_STATUS.UNEXPECTED,
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

    return {
      materials,
      unexpected,
      locations,
      counts,
      alreadyUploaded,
      pendingAfter,
      totalLocations: dbLocations.length,
    };
  }

  private async getOwnAudit(id: number, operator: CycleCountAuditOperator) {
    const audit = await this.prisma.cycleCountAudit.findUnique({
      where: { id },
      select: { id: true, auditNo: true, status: true, operatorId: true, downloadedAt: true, startedAt: true },
    });
    this.assertOwnAudit(id, audit, operator);
    return audit;
  }

  private assertOwnAudit<T extends { status: string; operatorId: number }>(
    id: number,
    audit: T | null,
    operator: CycleCountAuditOperator,
  ): asserts audit is T {
    if (!audit) {
      throw new NotFoundException({
        code: 'CYCLE_COUNT_AUDIT_NOT_FOUND',
        message: 'Audit not found. It may have been deleted.',
      });
    }
    if (audit.operatorId !== operator.userId) {
      throw new ForbiddenException({
        code: 'CYCLE_COUNT_AUDIT_NOT_ASSIGNED_TO_YOU',
        message: 'This audit is not assigned to you.',
      });
    }
  }

  private alreadySubmitted(status: string) {
    return new ConflictException({
      code: 'CYCLE_COUNT_AUDIT_ALREADY_SUBMITTED',
      message: `This audit is already submitted and can no longer be changed (status ${status}).`,
    });
  }

  private invalidSubmit(errors: string[]) {
    return new BadRequestException({
      code: 'CYCLE_COUNT_SUBMIT_INVALID',
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