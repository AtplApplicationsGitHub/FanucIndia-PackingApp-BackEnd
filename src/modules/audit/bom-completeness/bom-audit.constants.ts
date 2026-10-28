import {
  AUDIT_NO_REGISTRY,
  AUDIT_OPERATOR_OPEN_STATUSES,
  AUDIT_STATUS,
  AUDIT_STATUS_VALUES,
  AuditStatus,
} from '../shared/audit.constants';

export const BOM_AUDIT_STATUS = AUDIT_STATUS;

export type BomAuditStatus = AuditStatus;

export const BOM_AUDIT_STATUS_VALUES = AUDIT_STATUS_VALUES;

export const BOM_AUDIT_NO_PREFIX = AUDIT_NO_REGISTRY.BOM_COMPLETENESS.prefix;
export const BOM_AUDIT_NO_LOCK_KEY = AUDIT_NO_REGISTRY.BOM_COMPLETENESS.lockKey;

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
  operatorId: ['operator', 'operatorid'],
} as const;

export const BOM_AUDIT_COLUMN_LABELS = {
  materialCode: 'Material',
  storageBin: 'StorageBin',
  qty: 'Qty',
  operatorId: 'Operator',
} as const;

export const BOM_AUDIT_MAX_LENGTH = {
  auditName: 255,
  fileName: 500,
  storageBin: 100,
  materialCode: 100,
} as const;

export const BOM_AUDIT_MAX_OPERATOR_ID = 2_147_483_647;

export const BOM_AUDIT_OPERATOR_OPEN_STATUSES: string[] = AUDIT_OPERATOR_OPEN_STATUSES;

export const BOM_AUDIT_LINE_STATUS = {
  VALID: 'VALID',
  MISMATCH: 'MISMATCH',
  MISSING: 'MISSING',
  UNEXPECTED: 'UNEXPECTED',
} as const;

export const BOM_AUDIT_LINE_STATUS_VALUES = Object.values(BOM_AUDIT_LINE_STATUS);

export const BOM_AUDIT_REPORT = {
  sheetName: 'Report',
  locationSheetName: 'Locations',
  timeZone: 'Asia/Kolkata',
  retryIntervalMs: Number(process.env.BOM_AUDIT_REPORT_RETRY_MS) || 10 * 60 * 1000,
  maxAttempts: 10,
  retryBatchSize: 20,
  maxErrorLength: 1000,
} as const;

export const bomAuditReportFileName = (auditNo: string) => `${auditNo}_Report.xlsx`;

export const BOM_AUDIT_MAX_SUBMIT_LINES = 40000;
export const BOM_AUDIT_MAX_ACTUAL_QTY = 1_000_000;
export const BOM_AUDIT_CLIENT_SUBMISSION_ID_MAX = 64;

export const BOM_AUDIT_MOBILE_JSON_LIMIT = '25mb';
export const BOM_AUDIT_MOBILE_PATH_PREFIX = '/bom-audit/mobile/';

export const BOM_AUDIT_UPDATE_CHUNK_SIZE = 1000;

export const BOM_AUDIT_SUBMIT_TX_TIMEOUT_MS = 120_000;

export const BOM_AUDIT_HEADER_SEARCH_ROWS = 20;
