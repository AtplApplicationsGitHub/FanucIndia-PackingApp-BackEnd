import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { getIstTimestampRange } from '../../common/utils/date-only.util';
import { AuditOperatorsService } from './shared/audit-operators.service';
import {
  AUDIT_EDITABLE_STATUSES,
  AUDIT_STATUS,
  AUDIT_STATUS_LABELS,
  AUDIT_STATUS_VALUES,
  AUDIT_TYPE,
  AUDIT_TYPE_LABELS,
  AUDIT_TYPE_VALUES,
  AuditStatus,
  AuditType,
} from './shared/audit.constants';
import { QueryAuditStatusCountsDto } from './dto/query-audit-status-counts.dto';
import { QueryAuditListDto } from './dto/query-audit-list.dto';
import { BomAuditService } from './bom-completeness/bom-audit.service';
import { CycleCountService } from './cycle-count/cycle-count.service';

type AuditCountWhere = {
  status: AuditStatus;
  createdAt?: { gte?: Date; lt?: Date };
};

type StatusCounts = Record<AuditStatus, number>;

type AuditListFilters = {
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
};

type AuditListBin = { sequenceNo: number; storageBin: string };

type AuditListSourceRow = {
  id: number;
  auditNo: string;
  auditName: string;
  status: string;
  operatorId: number;
  operatorName: string;
  createdByName: string;
  createdAt: Date;
  storageBinCount: number;
  storageBins: AuditListBin[];
};

const REPORT_READY_STATUSES: string[] = [AUDIT_STATUS.RECONCILIATION_PENDING, AUDIT_STATUS.CLOSED];

@Injectable()
export class AuditService {
  private readonly counters: Record<AuditType, ((where: AuditCountWhere) => Promise<number>) | null>;

  constructor(
    private readonly operators: AuditOperatorsService,
    private readonly prisma: PrismaService,
    private readonly bomAudits: BomAuditService,
    private readonly cycleCounts: CycleCountService,
  ) {
    this.counters = {
      [AUDIT_TYPE.BOM_COMPLETENESS]: (where) => this.prisma.bomAudit.count({ where }),
      [AUDIT_TYPE.CYCLE_COUNT]: (where) => this.prisma.cycleCountAudit.count({ where }),
      [AUDIT_TYPE.LOCATION_AUDIT]: null,
      [AUDIT_TYPE.FREE_STOCK]: null,
    };
  }

  getOperators() {
    return this.operators.getOperators();
  }

  getStatuses() {
    return {
      message: 'Audit statuses fetched successfully.',
      data: AUDIT_STATUS_VALUES.map((value) => ({
        value,
        label: AUDIT_STATUS_LABELS[value],
        canReassign: AUDIT_EDITABLE_STATUSES.includes(value),
        canDelete: AUDIT_EDITABLE_STATUSES.includes(value),
      })),
    };
  }

  async getStatusCounts(query: QueryAuditStatusCountsDto) {
    const createdAt = this.resolveCreatedAtRange(query.fromDate, query.toDate);
    const types = query.auditType
      ? AUDIT_TYPE_VALUES.filter((type) => type === query.auditType)
      : AUDIT_TYPE_VALUES;

    const data = await Promise.all(
      types.map(async (auditType) => {
        const counter = this.counters[auditType];
        const values = await Promise.all(
          AUDIT_STATUS_VALUES.map((status) =>
            counter ? counter({ status, ...(createdAt ? { createdAt } : {}) }) : Promise.resolve(0),
          ),
        );
        const counts = this.toStatusCounts(values);
        return {
          auditType,
          label: AUDIT_TYPE_LABELS[auditType],
          available: counter !== null,
          counts,
          total: this.sum(counts),
        };
      }),
    );

    const overallCounts = this.toStatusCounts(
      AUDIT_STATUS_VALUES.map((status) => data.reduce((acc, row) => acc + row.counts[status], 0)),
    );

    return {
      message: 'Audit status counts fetched successfully.',
      data,
      overall: { ...overallCounts, total: this.sum(overallCounts) },
      filters: {
        auditType: query.auditType ?? null,
        fromDate: query.fromDate ?? null,
        toDate: query.toDate ?? null,
      },
    };
  }

  async listAudits(query: QueryAuditListDto) {
    const auditType = (query.auditType ?? AUDIT_TYPE.CYCLE_COUNT) as AuditType;
    this.resolveCreatedAtRange(query.fromDate, query.toDate);

    const filters: AuditListFilters = {
      search: query.search,
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };

    let rows: ReturnType<AuditService['toListRow']>[] = [];
    let pagination = { page: filters.page, limit: filters.limit, total: 0, totalPages: 0 };
    let available = true;

    switch (auditType) {
      case AUDIT_TYPE.BOM_COMPLETENESS: {
        const result = await this.bomAudits.findAll(filters);
        rows = result.data.map((a) => {
          const { id, auditNo, auditName, status, operatorId, operatorName, createdByName, createdAt,
            storageBinCount, storageBins, ...details } = a;
          return this.toListRow(auditType, {
            id, auditNo, auditName, status, operatorId, operatorName, createdByName, createdAt,
            storageBinCount, storageBins,
          }, details);
        });
        pagination = result.pagination;
        break;
      }
      case AUDIT_TYPE.CYCLE_COUNT: {
        const result = await this.cycleCounts.findAll(filters);
        rows = result.data.map((a) => {
          const { id, auditNo, auditName, status, operatorId, operatorName, createdByName, createdAt,
            storageBinCount, storageBins, ...details } = a;
          return this.toListRow(auditType, {
            id, auditNo, auditName, status, operatorId, operatorName, createdByName, createdAt,
            storageBinCount, storageBins,
          }, details);
        });
        pagination = result.pagination;
        break;
      }
      default:
        available = false;
    }

    return {
      message: `${AUDIT_TYPE_LABELS[auditType]} audits fetched successfully.`,
      auditType,
      label: AUDIT_TYPE_LABELS[auditType],
      available,
      data: rows,
      pagination,
    };
  }

  private toListRow(auditType: AuditType, row: AuditListSourceRow, details: Record<string, unknown>) {
    const editable = AUDIT_EDITABLE_STATUSES.includes(row.status as AuditStatus);
    return {
      auditType,
      id: row.id,
      auditNo: row.auditNo,
      auditName: row.auditName,
      status: row.status,
      statusLabel: AUDIT_STATUS_LABELS[row.status as AuditStatus] ?? row.status,
      operatorId: row.operatorId,
      operatorName: row.operatorName,
      storageBinCount: row.storageBinCount,
      storageBins: row.storageBins,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
      actions: {
        canReassign: auditType === AUDIT_TYPE.BOM_COMPLETENESS && editable,
        canDelete: editable,
        canDownloadReport:
          auditType === AUDIT_TYPE.BOM_COMPLETENESS && REPORT_READY_STATUSES.includes(row.status),
      },
      details,
    };
  }

  private resolveCreatedAtRange(fromDate?: string, toDate?: string) {
    if (!fromDate && !toDate) return undefined;

    if ((fromDate && !this.isRealDate(fromDate)) || (toDate && !this.isRealDate(toDate))) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: 'fromDate / toDate must be a valid date (YYYY-MM-DD).',
      });
    }

    const from = fromDate ? getIstTimestampRange(fromDate) : undefined;
    const to = toDate ? getIstTimestampRange(toDate) : undefined;

    if ((fromDate && !from) || (toDate && !to)) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: 'fromDate / toDate must be a valid date (YYYY-MM-DD).',
      });
    }
    if (from && to && from.startOfDay >= to.endOfDay) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'fromDate must be on or before toDate.',
      });
    }

    return {
      ...(from ? { gte: from.startOfDay } : {}),
      ...(to ? { lt: to.endOfDay } : {}),
    };
  }

  private isRealDate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }

  private toStatusCounts(values: number[]): StatusCounts {
    return AUDIT_STATUS_VALUES.reduce((acc, status, index) => {
      acc[status] = values[index] ?? 0;
      return acc;
    }, {} as StatusCounts);
  }

  private sum(counts: StatusCounts): number {
    return AUDIT_STATUS_VALUES.reduce((acc, status) => acc + counts[status], 0);
  }
}
