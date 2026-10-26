/*
 * Phase 2 - Cycle Count audit (Phase A: create the audit on the web).
 *
 * Flow (agreed with the client - M2 email + review meeting):
 *   A1 Upload SAP LX03 stock  ->  A2 Movement analysis (date range, live + ARCHIVED DIMS data)
 *   ->  A3 Stock validation  ->  A4 Plan (count / busiest / random / manual, CNC, A/B/C)
 *   ->  A5 Release: one audit per operator (same as BOM Completeness)
 */

export const CYCLE_COUNT_STATUS = {
  ASSIGNED: 'ASSIGNED',
  CANCELLED: 'CANCELLED',
  // Phase B (handheld) and Phase C (reconciliation) statuses are added when those phases are built
} as const;

export type CycleCountStatus =
  (typeof CYCLE_COUNT_STATUS)[keyof typeof CYCLE_COUNT_STATUS];

export const CYCLE_COUNT_STATUS_VALUES = Object.values(CYCLE_COUNT_STATUS);

export const CYCLE_COUNT_NO_PREFIX = 'AUD-CC';
export const CYCLE_COUNT_NO_DIGITS = 4;
/** pg_advisory_xact_lock key for the Audit No sequence (BOM uses 74020001). */
export const CYCLE_COUNT_NO_LOCK_KEY = 74020002;

// ---------------------------------------------------------------- A1 stock upload (LX03)

export const CYCLE_COUNT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const CYCLE_COUNT_MAX_DATA_ROWS = 20000;
export const CYCLE_COUNT_ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];
export const CYCLE_COUNT_HEADER_SEARCH_ROWS = 20;
export const CYCLE_COUNT_INSERT_CHUNK_SIZE = 1000;
/** Excluded rows returned to the web for review (all of them stay in the database). */
export const CYCLE_COUNT_MAX_EXCLUDED_RETURNED = 500;

/**
 * LX03 column names (normalised: lower case, letters + digits only).
 * The first alias found wins - "Avail" is used before "Stock" (LX03 has both).
 */
export const CYCLE_COUNT_REQUIRED_HEADERS = {
  storageBin: ['storagebin', 'storage', 'bin', 'binno', 'binnumber'],
  materialCode: ['material', 'materialcode', 'materialno', 'materialnumber', 'partno', 'partnumber'],
  qty: ['avail', 'availablestock', 'availableqty', 'qty', 'quantity', 'stock'],
} as const;

export const CYCLE_COUNT_OPTIONAL_HEADERS = {
  /** Package number on the box label (YD...). */
  certNo: ['certno', 'certificateno', 'certificatenumber', 'cert', 'ydno', 'yd', 'packageno', 'packagenumber', 'package'],
  batch: ['batch', 'batchno', 'batchnumber'],
  plant: ['plnt', 'plant'],
  storageLocation: ['location', 'storagelocation', 'sloc'],
  /** NOT in the LX03 sample - source to be confirmed with the client. */
  cnc: ['cnc', 'cncflag', 'iscnc', 'withcnc'],
  /** NOT in the LX03 sample - source to be confirmed with the client. */
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

/** Why a stock row is left out of planning (A3 stock validation). */
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

/** Qty is stored as DECIMAL(15,3). */
export const CYCLE_COUNT_MAX_QTY = 999_999_999_999;

// ---------------------------------------------------------------- A2 movement analysis

/**
 * DIMS movement data = transfer-order lines (one row per material line) of the live table
 * AND its archive table, grouped by Bin_No.
 *
 * dateColumn: which date decides that a line moved inside the selected range.
 * IssueUpdatedDate = time the material was picked from the bin (physical movement).
 * TO CONFIRM with the client - change it here only (must be one of allowedDateColumns).
 */
export const CYCLE_COUNT_MOVEMENT = {
  liveTable: 'ERP_Material_Data',
  archiveTable: 'ERP_Material_DataArchive',
  dateColumn: 'IssueUpdatedDate',
  allowedDateColumns: ['IssueUpdatedDate', 'UpdatedDate', 'PackingUpdatedDate'],
  /** Longest date range allowed for one analysis (days, inclusive). */
  maxRangeDays: 366,
} as const;

export const CYCLE_COUNT_MOVEMENT_LEVEL = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  NONE: 'NONE',
} as const;

// ---------------------------------------------------------------- A4 plan

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

/** Locations in one plan (all operators together). */
export const CYCLE_COUNT_MAX_PLAN_LOCATIONS = 500;
/** Operators one plan can be shared between. */
export const CYCLE_COUNT_MAX_OPERATORS = 20;
