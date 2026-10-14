export const BOM_AUDIT_STATUS = {
  ASSIGNED: 'ASSIGNED',
  CANCELLED: 'CANCELLED',
} as const;

export type BomAuditStatus =
  (typeof BOM_AUDIT_STATUS)[keyof typeof BOM_AUDIT_STATUS];

export const BOM_AUDIT_STATUS_VALUES = Object.values(BOM_AUDIT_STATUS);

export const BOM_AUDIT_NO_PREFIX = 'AUD-BOM';
export const BOM_AUDIT_NO_DIGITS = 4;
export const BOM_AUDIT_NO_LOCK_KEY = 74020001;

export const BOM_AUDIT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const BOM_AUDIT_MAX_DATA_ROWS = 20000;
export const BOM_AUDIT_ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];

export const BOM_AUDIT_MAX_REPORTED_ERRORS = 200;

export const BOM_AUDIT_INSERT_CHUNK_SIZE = 1000;

export const BOM_AUDIT_HEADER_ALIASES = {
  materialCode: [
    'materialcode',
    'material',
    'materialno',
    'materialnumber',
    'partno',
    'partnumber',
  ],
  storageBin: ['storage', 'storagebin', 'bin', 'binno', 'binnumber'],
  qty: ['qty', 'quantity', 'avail', 'expectedqty', 'availableqty'],
} as const;

export const BOM_AUDIT_COLUMN_LABELS = {
  materialCode: 'Material Code',
  storageBin: 'Storage',
  qty: 'Qty',
} as const;

export const BOM_AUDIT_MAX_LENGTH = {
  auditName: 255,
  fileName: 500,
  storageBin: 100,
  materialCode: 100,
} as const;
