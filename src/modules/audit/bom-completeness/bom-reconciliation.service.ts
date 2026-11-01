import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { AUDIT_STATUS } from '../shared/audit.constants';
import { BOM_AUDIT_LINE_STATUS } from './bom-audit.constants';
import { BomAuditReportService } from './bom-audit-report.service';

export const RECON_ERROR = {
  INVALID_AUDIT_TYPE: 'RECON_INVALID_AUDIT_TYPE',
  NOT_AVAILABLE: 'RECON_NOT_AVAILABLE',
  AUDIT_NOT_FOUND: 'RECON_AUDIT_NOT_FOUND',
  AUDIT_NOT_SUBMITTED: 'RECON_AUDIT_NOT_SUBMITTED',
  AUDIT_NOT_PENDING: 'RECON_AUDIT_NOT_PENDING',
  DISCREPANCY_NOT_FOUND: 'RECON_DISCREPANCY_NOT_FOUND',
  REMARKS_REQUIRED: 'RECON_REMARKS_REQUIRED',
  UNRESOLVED_REMAINING: 'RECON_UNRESOLVED_REMAINING',
} as const;

type ReviewInput = {
  decision: string;
  sapAction: string;
  remarks: string;
};

@Injectable()
export class BomReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: BomAuditReportService,
  ) {}

  private readonly auditInclude = {
    materials: {
      include: {
        location: {
          select: {
            storageBin: true,
            verifiedAt: true,
          },
        },
      },
      orderBy: {
        id: 'asc' as const,
      },
    },
    locations: {
      select: {
        id: true,
        sequenceNo: true,
        storageBin: true,
        expectedMaterials: true,
        verifiedAt: true,
      },
      orderBy: {
        sequenceNo: 'asc' as const,
      },
    },
  };

  private async getAudit(id: number) {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id },
      include: this.auditInclude,
    });

    if (!audit) {
      throw new NotFoundException({
        code: RECON_ERROR.AUDIT_NOT_FOUND,
        message: 'BOM audit not found.',
      });
    }

    if (
      audit.status !== AUDIT_STATUS.RECONCILIATION_PENDING &&
      audit.status !== AUDIT_STATUS.CLOSED
    ) {
      throw new ConflictException({
        code: RECON_ERROR.AUDIT_NOT_SUBMITTED,
        message: 'Audit has not been submitted for reconciliation.',
      });
    }

    return audit;
  }

  private toDetail(
    audit: Awaited<ReturnType<BomReconciliationService['getAudit']>>,
  ) {
    const materials = audit.materials;

    const discrepancies = materials.filter(
      (material) =>
        material.lineStatus === BOM_AUDIT_LINE_STATUS.MISSING ||
        material.lineStatus === BOM_AUDIT_LINE_STATUS.MISMATCH ||
        material.lineStatus === BOM_AUDIT_LINE_STATUS.UNEXPECTED,
    );

    const variances = discrepancies.map((material) => {
      let issueType = 'MISSING';

      if (material.lineStatus === BOM_AUDIT_LINE_STATUS.MISMATCH) {
        issueType = 'QUANTITY_MISMATCH';
      }

      if (material.lineStatus === BOM_AUDIT_LINE_STATUS.UNEXPECTED) {
        issueType = 'EXCESS';
      }

      return {
        id: material.id,
        storageBin: material.location.storageBin,
        materialCode: material.materialCode,
        expectedQty: material.expectedQty,
        scannedQty: material.actualQty ?? 0,
        issueType,
        status: material.resolvedAt ? 'RESOLVED' : 'OPEN',
        decision: material.reconDecision,
        sapAction: material.reconSapAction,
        remarks: material.reconRemarks ?? '',
        scannedAt: material.lastScannedAt,
        locationCompletedAt: material.location.verifiedAt,
        resolvedAt: material.resolvedAt,
        resolvedByName: material.resolvedByName,
      };
    });

    const expectedComponents = materials.filter(
      (material) => !material.isUnexpected,
    ).length;

    const scannedComponents = materials.filter(
      (material) => (material.actualQty ?? 0) > 0,
    ).length;

    const matchedComponents = materials.filter(
      (material) => material.lineStatus === BOM_AUDIT_LINE_STATUS.VALID,
    ).length;

    const totalVariances = variances.length;

    const openVariances = variances.filter(
      (variance) => variance.status === 'OPEN',
    ).length;

    const resolvedVariances = totalVariances - openVariances;

    const accuracy =
      expectedComponents > 0
        ? Math.round((matchedComponents / expectedComponents) * 1000) / 10
        : 100;

    let reviewStatus = 'NOT_STARTED';

    if (audit.status === AUDIT_STATUS.CLOSED) {
      reviewStatus = 'CLOSED';
    } else if (totalVariances === 0 || openVariances === 0) {
      reviewStatus = 'ALL_REVIEWED';
    } else if (resolvedVariances > 0) {
      reviewStatus = 'REVIEWING';
    }

    const locations = audit.locations.map((location) => {
      const locationMaterials = materials.filter(
        (material) => material.auditLocationId === location.id,
      );
      const countStatus = (lineStatus: string) =>
        locationMaterials.filter(
          (material) => material.lineStatus === lineStatus,
        ).length;
      const locationVariances = variances.filter(
        (variance) => variance.storageBin === location.storageBin,
      );
      const openCount = locationVariances.filter(
        (variance) => variance.status === 'OPEN',
      ).length;

      return {
        sequenceNo: location.sequenceNo,
        storageBin: location.storageBin,
        expectedMaterials: location.expectedMaterials,
        valid: countStatus(BOM_AUDIT_LINE_STATUS.VALID),
        mismatch: countStatus(BOM_AUDIT_LINE_STATUS.MISMATCH),
        missing: countStatus(BOM_AUDIT_LINE_STATUS.MISSING),
        unexpected: countStatus(BOM_AUDIT_LINE_STATUS.UNEXPECTED),
        totalVariances: locationVariances.length,
        openVariances: openCount,
        resolvedVariances: locationVariances.length - openCount,
        completedAt: location.verifiedAt,
      };
    });

    return {
      id: audit.id,
      auditNo: audit.auditNo,
      auditName: audit.auditName,
      auditType: 'BOM_COMPLETENESS',
      status: audit.status,
      reviewStatus,
      operatorId: audit.operatorId,
      operatorName: audit.operatorName,
      fileName: audit.fileName,
      createdAt: audit.createdAt,
      submittedAt: audit.submittedAt,
      totalLocations: audit.totalLocations,
      expectedComponents,
      scannedComponents,
      matchedComponents,
      accuracy,
      totalVariances,
      openVariances,
      resolvedVariances,
      locations,
      variances,
      closedAt: audit.closedAt,
      closedByName: audit.closedByName,
      canClose:
        audit.status === AUDIT_STATUS.RECONCILIATION_PENDING &&
        openVariances === 0,
    };
  }

  async detail(id: number) {
    const audit = await this.getAudit(id);

    return {
      message: 'Audit reconciliation detail fetched successfully.',
      data: this.toDetail(audit),
    };
  }

  async review(
    id: number,
    varianceId: number,
    input: ReviewInput,
    userName: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT "id"
        FROM "BomAudit"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new NotFoundException({
          code: RECON_ERROR.AUDIT_NOT_FOUND,
          message: 'BOM audit not found.',
        });
      }

      const audit = await tx.bomAudit.findUnique({
        where: { id },
      });

      if (audit?.status !== AUDIT_STATUS.RECONCILIATION_PENDING) {
        throw new ConflictException({
          code: RECON_ERROR.AUDIT_NOT_PENDING,
          message: 'Audit is not pending reconciliation.',
        });
      }

      const material = await tx.bomAuditMaterial.findFirst({
        where: {
          id: varianceId,
          auditId: id,
        },
      });

      if (
        !material ||
        ![
          BOM_AUDIT_LINE_STATUS.MISSING,
          BOM_AUDIT_LINE_STATUS.MISMATCH,
          BOM_AUDIT_LINE_STATUS.UNEXPECTED,
        ].includes(material.lineStatus as any)
      ) {
        throw new NotFoundException({
          code: RECON_ERROR.DISCREPANCY_NOT_FOUND,
          message: 'Discrepancy not found.',
        });
      }

      if (!input.remarks.trim()) {
        throw new BadRequestException({
          code: RECON_ERROR.REMARKS_REQUIRED,
          message: 'Remarks are required.',
        });
      }

      await tx.bomAuditMaterial.update({
        where: {
          id: material.id,
        },
        data: {
          reconDecision: input.decision,
          reconSapAction: input.sapAction,
          reconRemarks: input.remarks.trim(),
          resolvedAt: new Date(),
          resolvedByName: userName,
        },
      });
    });

    return this.detail(id);
  }

  async bulkReview(
    id: number,
    varianceIds: number[],
    input: ReviewInput,
    userName: string,
  ) {
    const remarks = input.remarks.trim();

    if (!remarks) {
      throw new BadRequestException({
        code: RECON_ERROR.REMARKS_REQUIRED,
        message: 'Remarks are required.',
      });
    }

    const ids = Array.from(new Set(varianceIds));

    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT "id"
        FROM "BomAudit"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new NotFoundException({
          code: RECON_ERROR.AUDIT_NOT_FOUND,
          message: 'BOM audit not found.',
        });
      }

      const audit = await tx.bomAudit.findUnique({
        where: { id },
      });

      if (audit?.status !== AUDIT_STATUS.RECONCILIATION_PENDING) {
        throw new ConflictException({
          code: RECON_ERROR.AUDIT_NOT_PENDING,
          message: 'Audit is not pending reconciliation.',
        });
      }

      const found = await tx.bomAuditMaterial.findMany({
        where: {
          id: { in: ids },
          auditId: id,
          lineStatus: {
            in: [
              BOM_AUDIT_LINE_STATUS.MISSING,
              BOM_AUDIT_LINE_STATUS.MISMATCH,
              BOM_AUDIT_LINE_STATUS.UNEXPECTED,
            ],
          },
        },
        select: { id: true },
      });

      if (found.length !== ids.length) {
        const foundIds = new Set(found.map((material) => material.id));
        const missingIds = ids.filter(
          (varianceId) => !foundIds.has(varianceId),
        );
        throw new NotFoundException({
          code: RECON_ERROR.DISCREPANCY_NOT_FOUND,
          message: `Discrepancy not found: ${missingIds.join(', ')}.`,
        });
      }

      const result = await tx.bomAuditMaterial.updateMany({
        where: {
          id: { in: ids },
          auditId: id,
        },
        data: {
          reconDecision: input.decision,
          reconSapAction: input.sapAction,
          reconRemarks: remarks,
          resolvedAt: new Date(),
          resolvedByName: userName,
        },
      });

      return result.count;
    });

    const audit = await this.getAudit(id);

    return {
      message: `${updated} ${updated === 1 ? 'discrepancy' : 'discrepancies'} reviewed successfully.`,
      data: this.toDetail(audit),
    };
  }

  async close(id: number, userName: string) {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT "id"
        FROM "BomAudit"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new NotFoundException({
          code: RECON_ERROR.AUDIT_NOT_FOUND,
          message: 'BOM audit not found.',
        });
      }

      const audit = await tx.bomAudit.findUnique({
        where: { id },
      });

      if (audit?.status !== AUDIT_STATUS.RECONCILIATION_PENDING) {
        throw new ConflictException({
          code: RECON_ERROR.AUDIT_NOT_PENDING,
          message: 'Audit is not pending reconciliation.',
        });
      }

      const unresolved = await tx.bomAuditMaterial.count({
        where: {
          auditId: id,
          lineStatus: {
            in: [
              BOM_AUDIT_LINE_STATUS.MISSING,
              BOM_AUDIT_LINE_STATUS.MISMATCH,
              BOM_AUDIT_LINE_STATUS.UNEXPECTED,
            ],
          },
          resolvedAt: null,
        },
      });

      if (unresolved > 0) {
        throw new ConflictException({
          code: RECON_ERROR.UNRESOLVED_REMAINING,
          message: `${unresolved} ${unresolved === 1 ? 'discrepancy remains' : 'discrepancies remain'} unresolved.`,
        });
      }

      await tx.bomAudit.update({
        where: { id },
        data: {
          status: AUDIT_STATUS.CLOSED,
          closedAt: new Date(),
          closedByName: userName,
          reportPath: null,
          reportGeneratedAt: null,
          reportError: null,
          reportAttempts: 0,
        },
      });
    });

    this.reportService.generateInBackground(id);

    return this.detail(id);
  }
}
