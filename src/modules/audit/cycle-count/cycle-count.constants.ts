import {
  AUDIT_NO_REGISTRY,
  AUDIT_STATUS,
  AUDIT_STATUS_VALUES,
  AuditStatus,
} from '../shared/audit.constants';

export const CYCLE_COUNT_STATUS = AUDIT_STATUS;

export type CycleCountStatus = AuditStatus;

export const CYCLE_COUNT_STATUS_VALUES = AUDIT_STATUS_VALUES;

export const CYCLE_COUNT_NO_PREFIX = AUDIT_NO_REGISTRY.CYCLE_COUNT.prefix;

export const CYCLE_COUNT_NO_LOCK_KEY = AUDIT_NO_REGISTRY.CYCLE_COUNT.lockKey;

export const CYCLE_COUNT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const CYCLE_COUNT_MAX_DATA_ROWS = 20000;
export const CYCLE_COUNT_ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];
export const CYCLE_COUNT_HEADER_SEARCH_ROWS = 20;
export const CYCLE_COUNT_INSERT_CHUNK_SIZE = 1000;

export const CYCLE_COUNT_MAX_EXCLUDED_RETURNED = 500;

export const CYCLE_COUNT_REQUIRED_HEADERS = {
  storageBin: ['storagebin', 'storage', 'bin', 'binno', 'binnumber'],
  materialCode: ['material', 'materialcode', 'materialno', 'materialnumber', 'partno', 'partnumber'],
  qty: ['avail', 'availablestock', 'availableqty', 'qty', 'quantity', 'stock'],
} as const;

export const CYCLE_COUNT_OPTIONAL_HEADERS = {
  certNo: ['certno', 'certificateno', 'certificatenumber', 'cert', 'ydno', 'yd', 'packageno', 'packagenumber', 'package'],
  batch: ['batch', 'batchno', 'batchnumber'],
  plant: ['plnt', 'plant'],
  storageLocation: ['location', 'storagelocation', 'sloc'],
  cnc: ['cnc', 'cncflag', 'iscnc', 'withcnc'],
  materialClass: ['class', 'materialclass', 'abcclass', 'abc', 'abcindicator'],
} as const;

export const CYCLE_COUNT_COLUMN_LABELS = {
  storageBin: 'StorageBin',
  materialCode: 'Material',
  qty: 'Avail',
} as const;

export const CYCLE_COUNT_MAX_LENGTH = {
  auditName: 255,
  fileName: 500,
  storageBin: 100,
  materialCode: 100,
  certNo: 100,
  batch: 100,
  plant: 50,
  storageLocation: 50,
} as const;

export const CYCLE_COUNT_EXCLUDE_REASON = {
  ZERO_STOCK: 'ZERO_STOCK',
  INVALID_QTY: 'INVALID_QTY',
  NO_LOCATION: 'NO_LOCATION',
  NO_MATERIAL: 'NO_MATERIAL',
  VALUE_TOO_LONG: 'VALUE_TOO_LONG',
} as const;

export const CYCLE_COUNT_EXCLUDE_REASON_LABELS: Record<string, string> = {
  ZERO_STOCK: 'Zero stock',
  INVALID_QTY: 'Invalid quantity',
  NO_LOCATION: 'Storage bin missing',
  NO_MATERIAL: 'Material missing',
  VALUE_TOO_LONG: 'Value too long',
};

export const CYCLE_COUNT_MAX_QTY = 999_999_999_999;

export const CYCLE_COUNT_MOVEMENT = {
  liveTable: 'ERP_Material_Data',
  archiveTable: 'ERP_Material_DataArchive',
  dateColumn: 'IssueUpdatedDate',
  allowedDateColumns: ['IssueUpdatedDate', 'UpdatedDate', 'PackingUpdatedDate'],
  maxRangeDays: 366,
} as const;

export const CYCLE_COUNT_MOVEMENT_LEVEL = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  NONE: 'NONE',
} as const;

export const CYCLE_COUNT_SELECTION_METHOD = {
  BUSIEST: 'BUSIEST',
  RANDOM: 'RANDOM',
  MANUAL: 'MANUAL',
} as const;
export const CYCLE_COUNT_SELECTION_METHOD_VALUES = Object.values(CYCLE_COUNT_SELECTION_METHOD);

export const CYCLE_COUNT_CNC_FILTER = {
  BOTH: 'BOTH',
  WITH_CNC: 'WITH_CNC',
  WITHOUT_CNC: 'WITHOUT_CNC',
} as const;
export const CYCLE_COUNT_CNC_FILTER_VALUES = Object.values(CYCLE_COUNT_CNC_FILTER);

export const CYCLE_COUNT_MATERIAL_CLASSES = ['A', 'B', 'C'] as const;

export const CYCLE_COUNT_MAX_PLAN_LOCATIONS = 500;

export const CYCLE_COUNT_MAX_OPERATORS = 20;
