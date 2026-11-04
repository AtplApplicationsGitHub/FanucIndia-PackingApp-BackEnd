import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';
import { AUDIT_STATUS } from '../shared/audit.constants';
import { BOM_AUDIT_LINE_STATUS } from './bom-audit.constants';
import { BomAuditReportService } from './bom-audit-report.service';
import { calculateBomAuditAccuracy } from './bom-audit-accuracy';

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

export const RECON_CATEGORY = {
  ALL: 'ALL',
  ALL_EXCEPT_VALID: 'ALL_EXCEPT_VALID',
  VALID: 'VALID',
  MISSING: 'MISSING',
  QUANTITY_MISMATCH: 'QUANTITY_MISMATCH',
  EXCESS: 'EXCESS',
} as const;

export const RECON_CATEGORY_VALUES = Object.values(RECON_CATEGORY);

export const RECON_LINE_STATUS_FILTER = {
  ALL: 'ALL',
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
} as const;

export const RECON_LINE_STATUS_FILTER_VALUES = Object.values(RECON_LINE_STATUS_FILTER);

export const RECON_LINES_DEFAULT_LIMIT = 10;
export const RECON_LINES_MAX_LIMIT = 100;

export type ReconLinesQuery = {
  search?: string;
  storageBin?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
};

const DISCREPANCY_STATUSES: string[] = [
  BOM_AUDIT_LINE_STATUS.MISSING,
  BOM_AUDIT_LINE_STATUS.MISMATCH,
  BOM_AUDIT_LINE_STATUS.UNEXPECTED,
];

const RECON_READABLE_STATUSES: string[] = [
  AUDIT_STATUS.IN_PROGRESS,
  AUDIT_STATUS.RECONCILIATION_PENDING,
  AUDIT_STATUS.CLOSED,
];

const ISSUE_TYPE_BY_LINE_STATUS: Record<string, string> = {
  [BOM_AUDIT_LINE_STATUS.VALID]: RECON_CATEGORY.VALID,
  [BOM_AUDIT_LINE_STATUS.MISSING]: RECON_CATEGORY.MISSING,
  [BOM_AUDIT_LINE_STATUS.MISMATCH]: RECON_CATEGORY.QUANTITY_MISMATCH,
  [BOM_AUDIT_LINE_STATUS.UNEXPECTED]: RECON_CATEGORY.EXCESS,
};

const RECON_CATEGORY_LINE_STATUSES: Record<string, string[] | null> = {
  [RECON_CATEGORY.ALL]: null,
  [RECON_CATEGORY.ALL_EXCEPT_VALID]: DISCREPANCY_STATUSES,
  [RECON_CATEGORY.VALID]: [BOM_AUDIT_LINE_STATUS.VALID],
  [RECON_CATEGORY.MISSING]: [BOM_AUDIT_LINE_STATUS.MISSING],
  [RECON_CATEGORY.QUANTITY_MISMATCH]: [BOM_AUDIT_LINE_STATUS.MISMATCH],
  [RECON_CATEGORY.EXCESS]: [BOM_AUDIT_LINE_STATUS.UNEXPECTED],
};

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
            uploadedAt: true,
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
        uploadedAt: true,
      },
      orderBy: {
        sequenceNo: 'asc' as const,
      },
    },
  };

  private assertReadable(audit: { status: string } | null): asserts audit is { status: string } {
    if (!audit) {
      throw new NotFoundException({
        code: RECON_ERROR.AUDIT_NOT_FOUND,
        message: 'BOM audit not found.',
      });
    }

    if (!RECON_READABLE_STATUSES.includes(audit.status)) {
      throw new ConflictException({
        code: RECON_ERROR.AUDIT_NOT_SUBMITTED,
        message: 'Audit has not been downloaded to the handheld yet. Scanned data appears once locations are uploaded.',
      });
    }
  }

  private async getAudit(id: number) {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id },
      include: this.auditInclude,
    });

    this.assertReadable(audit);
    return audit!;
  }

  private toDetail(
    audit: Awaited<ReturnType<BomReconciliationService['getAudit']>>,
  ) {
    const partial = audit.status === AUDIT_STATUS.IN_PROGRESS;
    const uploadedLocationIds = new Set(
      audit.locations
        .filter((location) => !partial || location.uploadedAt !== null)
        .map((location) => location.id),
    );
    const allMaterials = audit.materials;
    const materials = allMaterials.filter((material) =>
      uploadedLocationIds.has(material.auditLocationId),
    );

    const discrepancies = materials
      .filter((material) => DISCREPANCY_STATUSES.includes(material.lineStatus ?? ''))
      .map((material) => ({
        storageBin: material.location.storageBin,
        status: material.resolvedAt ? 'RESOLVED' : 'OPEN',
      }));

    const expectedComponents = materials.filter(
      (material) => !material.isUnexpected,
    ).length;

    const scannedComponents = materials.filter(
      (material) => (material.actualQty ?? 0) > 0,
    ).length;

    const matchedComponents = materials.filter(
      (material) => material.lineStatus === BOM_AUDIT_LINE_STATUS.VALID,
    ).length;

    const totalVariances = discrepancies.length;

    const openVariances = discrepancies.filter(
      (variance) => variance.status === 'OPEN',
    ).length;

    const resolvedVariances = totalVariances - openVariances;

    const { lineAccuracy, qtyAccuracy } = calculateBomAuditAccuracy(materials);

    let reviewStatus = 'NOT_STARTED';

    if (audit.status === AUDIT_STATUS.CLOSED) {
      reviewStatus = 'CLOSED';
    } else if (partial) {
      reviewStatus = 'AWAITING_UPLOAD';
    } else if (totalVariances === 0 || openVariances === 0) {
      reviewStatus = 'ALL_REVIEWED';
    } else if (resolvedVariances > 0) {
      reviewStatus = 'REVIEWING';
    }

    const locations = audit.locations.map((location) => {
      const uploaded = uploadedLocationIds.has(location.id);
      const locationMaterials = uploaded
        ? materials.filter((material) => material.auditLocationId === location.id)
        : [];
      const countStatus = (lineStatus: string) =>
        locationMaterials.filter(
          (material) => material.lineStatus === lineStatus,
        ).length;
      const locationVariances = discrepancies.filter(
        (variance) => variance.storageBin === location.storageBin,
      );
      const openCount = locationVariances.filter(
        (variance) => variance.status === 'OPEN',
      ).length;

      return {
        sequenceNo: location.sequenceNo,
        storageBin: location.storageBin,
        expectedMaterials: location.expectedMaterials,
        uploaded,
        uploadedAt: location.uploadedAt,
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
      partial,
      canReview: audit.status === AUDIT_STATUS.RECONCILIATION_PENDING,
      operatorId: audit.operatorId,
      operatorName: audit.operatorName,
      fileName: audit.fileName,
      createdAt: audit.createdAt,
      submittedAt: audit.submittedAt,
      totalLocations: audit.totalLocations,
      uploadedLocations: uploadedLocationIds.size,
      auditExpectedComponents: allMaterials.filter((material) => !material.isUnexpected).length,
      expectedComponents,
      scannedComponents,
      matchedComponents,
      accuracy: lineAccuracy,
      qtyAccuracy,
      totalVariances,
      openVariances,
      resolvedVariances,
      locations,
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

  async lines(id: number, query: ReconLinesQuery) {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id },
      select: { status: true },
    });
    this.assertReadable(audit);

    const partial = audit!.status === AUDIT_STATUS.IN_PROGRESS;
    const page = query.page ?? 1;
    const limit = query.limit ?? RECON_LINES_DEFAULT_LIMIT;
    const filters: Prisma.BomAuditMaterialWhereInput[] = [];

    const search = query.search?.trim();
    if (search) {
      filters.push({
        OR: [
          { materialCode: { contains: search, mode: 'insensitive' } },
          { location: { storageBin: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const storageBin = query.storageBin?.trim();
    if (storageBin) {
      filters.push({ location: { storageBin: { equals: storageBin, mode: 'insensitive' } } });
    }

    const countFilters = [...filters];
    const category = query.category ?? RECON_CATEGORY.ALL;
    const lineStatuses = RECON_CATEGORY_LINE_STATUSES[category];
    if (lineStatuses) filters.push({ lineStatus: { in: lineStatuses } });

    const status = query.status ?? RECON_LINE_STATUS_FILTER.ALL;
    if (status !== RECON_LINE_STATUS_FILTER.ALL) {
      const reviewFilter: Prisma.BomAuditMaterialWhereInput = {
        lineStatus: { in: DISCREPANCY_STATUSES },
        resolvedAt: status === RECON_LINE_STATUS_FILTER.RESOLVED ? { not: null } : null,
      };
      filters.push(reviewFilter);
      countFilters.push(reviewFilter);
    }

    if (partial && (lineStatuses || status !== RECON_LINE_STATUS_FILTER.ALL)) {
      filters.push({ location: { uploadedAt: { not: null } } });
    }

    const where: Prisma.BomAuditMaterialWhereInput = { auditId: id, AND: filters };

    const allCountWhere: Prisma.BomAuditMaterialWhereInput = {
      auditId: id,
      AND: [
        ...countFilters,
        ...(partial && status !== RECON_LINE_STATUS_FILTER.ALL
          ? [{ location: { uploadedAt: { not: null } } }]
          : []),
      ],
    };
    const categoryCountWhere: Prisma.BomAuditMaterialWhereInput = {
      auditId: id,
      AND: [
        ...countFilters,
        ...(partial ? [{ location: { uploadedAt: { not: null } } }] : []),
      ],
    };
    const [total, rows, allCount, groupedCategories] = await this.prisma.$transaction([
      this.prisma.bomAuditMaterial.count({ where }),
      this.prisma.bomAuditMaterial.findMany({
        where,
        include: {
          location: {
            select: { storageBin: true, verifiedAt: true, uploadedAt: true },
          },
        },
        orderBy: [
          { location: { sequenceNo: 'asc' } },
          { isUnexpected: 'asc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bomAuditMaterial.count({ where: allCountWhere }),
      this.prisma.bomAuditMaterial.groupBy({
        by: ['lineStatus'],
        where: categoryCountWhere,
        _count: { _all: true },
      }),
    ]);
    const countCategory = (statuses: string[]) => groupedCategories.reduce(
      (sum, group) => sum + (group.lineStatus && statuses.includes(group.lineStatus) ? group._count._all : 0),
      0,
    );
    const categoryCounts = {
      ALL: allCount,
      ALL_EXCEPT_VALID: countCategory(DISCREPANCY_STATUSES),
      VALID: countCategory([BOM_AUDIT_LINE_STATUS.VALID]),
      MISSING: countCategory([BOM_AUDIT_LINE_STATUS.MISSING]),
      QUANTITY_MISMATCH: countCategory([BOM_AUDIT_LINE_STATUS.MISMATCH]),
      EXCESS: countCategory([BOM_AUDIT_LINE_STATUS.UNEXPECTED]),
    };

    return {
      message: 'Audit reconciliation lines fetched successfully.',
      categoryCounts,
      data: rows.map((material) => this.toLine(material, partial)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private toLine(
    material: Prisma.BomAuditMaterialGetPayload<{
      include: { location: { select: { storageBin: true; verifiedAt: true; uploadedAt: true } } };
    }>,
    partial: boolean,
  ) {
    const pending = partial && material.location.uploadedAt === null;
    const discrepancy = !pending && DISCREPANCY_STATUSES.includes(material.lineStatus ?? '');
    const status = discrepancy ? (material.resolvedAt ? 'RESOLVED' : 'OPEN') : null;

    return {
      id: material.id,
      storageBin: material.location.storageBin,
      materialCode: material.materialCode,
      expectedQty: material.expectedQty,
      scannedQty: pending ? null : (material.actualQty ?? 0),
      pending,
      issueType: pending ? null : (ISSUE_TYPE_BY_LINE_STATUS[material.lineStatus ?? ''] ?? null),
      status,
      decision: status ? material.reconDecision : null,
      sapAction: status ? material.reconSapAction : null,
      remarks: status ? (material.reconRemarks ?? '') : '',
      scannedAt: pending ? null : material.lastScannedAt,
      locationCompletedAt: pending ? null : material.location.verifiedAt,
      resolvedAt: status ? material.resolvedAt : null,
      resolvedByName: status ? material.resolvedByName : null,
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
