import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { AUDIT_STATUS } from '../shared/audit.constants';
import { BOM_AUDIT_LINE_STATUS } from './bom-audit.constants';

type ReviewInput = {
  decision: string;
  sapAction: string;
  remarks: string;
};

@Injectable()
export class BomReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly auditInclude = {
    materials: {
      include: {
        location: {
          select: {
            storageBin: true,
          },
        },
      },
      orderBy: {
        id: 'asc' as const,
      },
    },
  };

  private async getAudit(id: number) {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id },
      include: this.auditInclude,
    });

    if (!audit) {
      throw new NotFoundException('BOM audit not found.');
    }

    if (
      audit.status !== AUDIT_STATUS.RECONCILIATION_PENDING &&
      audit.status !== AUDIT_STATUS.CLOSED
    ) {
      throw new ConflictException(
        'Audit has not been submitted for reconciliation.',
      );
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

    let reviewStatus = 'PENDING_RECONCILIATION';

    if (audit.status === AUDIT_STATUS.CLOSED) {
      reviewStatus = 'CLOSED';
    } else if (totalVariances === 0 || openVariances === 0) {
      reviewStatus = 'RECONCILED';
    } else if (resolvedVariances > 0) {
      reviewStatus = 'IN_PROGRESS';
    }

    const locations = Array.from(
      new Set(variances.map((variance) => variance.storageBin)),
    ).map((storageBin) => {
      const locationVariances = variances.filter(
        (variance) => variance.storageBin === storageBin,
      );

      return {
        storageBin,
        totalVariances: locationVariances.length,
        openVariances: locationVariances.filter(
          (variance) => variance.status === 'OPEN',
        ).length,
        resolvedVariances: locationVariances.filter(
          (variance) => variance.status === 'RESOLVED',
        ).length,
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
        throw new NotFoundException('BOM audit not found.');
      }

      const audit = await tx.bomAudit.findUnique({
        where: { id },
      });

      if (audit?.status !== AUDIT_STATUS.RECONCILIATION_PENDING) {
        throw new ConflictException('Audit is not pending reconciliation.');
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
        throw new NotFoundException('Discrepancy not found.');
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

  async close(id: number, userName: string) {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: number }[]>`
        SELECT "id"
        FROM "BomAudit"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new NotFoundException('BOM audit not found.');
      }

      const audit = await tx.bomAudit.findUnique({
        where: { id },
      });

      if (audit?.status !== AUDIT_STATUS.RECONCILIATION_PENDING) {
        throw new ConflictException('Audit is not pending reconciliation.');
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
        throw new ConflictException(
          `${unresolved} discrepancies remain unresolved.`,
        );
      }

      await tx.bomAudit.update({
        where: { id },
        data: {
          status: AUDIT_STATUS.CLOSED,
          closedAt: new Date(),
          closedByName: userName,
        },
      });
    });

    return this.detail(id);
  }
}
