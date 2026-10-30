export const AUDIT_TIME_ZONE = 'Asia/Kolkata';

export const AUDIT_MAX_FILE_NAME_LENGTH = 500;

export const AUDIT_STATUS = {
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RECONCILIATION_PENDING: 'RECONCILIATION_PENDING',
  CLOSED: 'CLOSED',
} as const;

export type AuditStatus = (typeof AUDIT_STATUS)[keyof typeof AUDIT_STATUS];

export const AUDIT_STATUS_VALUES: AuditStatus[] = Object.values(AUDIT_STATUS);

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RECONCILIATION_PENDING: 'Reconciliation Pending',
  CLOSED: 'Closed',
};

export const AUDIT_STATUS_FILTER_ALL = 'ALL';

export function toStatusFilter(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim().toUpperCase();
  return text === '' || text === AUDIT_STATUS_FILTER_ALL ? undefined : text;
}

export const AUDIT_EDITABLE_STATUSES: AuditStatus[] = [AUDIT_STATUS.ASSIGNED];

export const AUDIT_OPERATOR_OPEN_STATUSES: AuditStatus[] = [
  AUDIT_STATUS.ASSIGNED,
  AUDIT_STATUS.IN_PROGRESS,
];

export const AUDIT_NO_REGISTRY = {
  BOM_COMPLETENESS: { prefix: 'BOM', lockKey: 74020001 },
  CYCLE_COUNT: { prefix: 'CC', lockKey: 74020002 },
  LOCATION_AUDIT: { prefix: 'LA', lockKey: 74020003 },
  FREE_STOCK: { prefix: 'FS4A', lockKey: 74020004 },
} as const;

export const AUDIT_TYPE = {
  BOM_COMPLETENESS: 'BOM_COMPLETENESS',
  CYCLE_COUNT: 'CYCLE_COUNT',
  LOCATION_AUDIT: 'LOCATION_AUDIT',
  FREE_STOCK: 'FREE_STOCK',
} as const;

export type AuditType = (typeof AUDIT_TYPE)[keyof typeof AUDIT_TYPE];

export const AUDIT_TYPE_VALUES: AuditType[] = Object.values(AUDIT_TYPE);

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  BOM_COMPLETENESS: 'BOM Completeness',
  CYCLE_COUNT: 'Cycle Count',
  LOCATION_AUDIT: 'Location Audit',
  FREE_STOCK: 'Free Stock / 4th Axis',
};

export const AUDIT_NO_DIGITS = 4;
export const AUDIT_NO_MAX_PER_MONTH = 9999;
