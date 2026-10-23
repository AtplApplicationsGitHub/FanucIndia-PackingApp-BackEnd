export const BOM_AUDIT_STATUS = {
  ASSIGNED: 'ASSIGNED',
  CANCELLED: 'CANCELLED',
  // Stage B - handheld
  DOWNLOADED: 'DOWNLOADED', // operator downloaded it to the handheld (can no longer be cancelled)
  IN_PROGRESS: 'IN_PROGRESS', // operator opened it on the handheld
  PENDING_RECONCILIATION: 'PENDING_RECONCILIATION', // results submitted, waiting for the admin review (Stage C)
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
  operator: 320,
} as const;

// ---------------------------------------------------------------- Stage B (handheld)

/** Audits the operator still has to work on (shown in "My Tasks" on the handheld). */
export const BOM_AUDIT_OPERATOR_OPEN_STATUSES: string[] = [
  BOM_AUDIT_STATUS.ASSIGNED,
  BOM_AUDIT_STATUS.DOWNLOADED,
  BOM_AUDIT_STATUS.IN_PROGRESS,
];

/** Result of one material line after the handheld submit. */
export const BOM_AUDIT_LINE_STATUS = {
  VALID: 'VALID', // actual = expected
  MISMATCH: 'MISMATCH', // actual != expected (and actual > 0)
  MISSING: 'MISSING', // expected but not scanned at all
  UNEXPECTED: 'UNEXPECTED', // scanned at the location but not in the uploaded file
} as const;

export const BOM_AUDIT_LINE_STATUS_VALUES = Object.values(BOM_AUDIT_LINE_STATUS);

/** Report Excel created after submit and saved on the SFTP server (see sftp/audit-report-paths.ts). */
export const BOM_AUDIT_REPORT = {
  sheetName: 'Report',
  locationSheetName: 'Locations',
  /** Times in the report are shown in India time */
  timeZone: 'Asia/Kolkata',
  /** Failed uploads are retried every 10 minutes (BOM_AUDIT_REPORT_RETRY_MS in .env to change) ... */
  retryIntervalMs: Number(process.env.BOM_AUDIT_REPORT_RETRY_MS) || 10 * 60 * 1000,
  /** ... up to this many times; after that only "Download Report" on the web tries again */
  maxAttempts: 10,
  /** Audits handled per retry round */
  retryBatchSize: 20,
  maxErrorLength: 1000,
} as const;

/** e.g. AUD-BOM-2026-0010_Report.xlsx */
export const bomAuditReportFileName = (auditNo: string) => `${auditNo}_Report.xlsx`;

/** Submit limits: the file allows 20,000 lines; unexpected scans can add more. */
export const BOM_AUDIT_MAX_SUBMIT_LINES = 40000;
export const BOM_AUDIT_MAX_ACTUAL_QTY = 1_000_000;
export const BOM_AUDIT_CLIENT_SUBMISSION_ID_MAX = 64;

/** Bigger JSON body limit for the handheld routes only (a 20,000-line submit is ~4 MB). */
export const BOM_AUDIT_MOBILE_JSON_LIMIT = '25mb';
export const BOM_AUDIT_MOBILE_PATH_PREFIX = '/bom-audit/mobile/';

/** Updates inside the submit transaction are written in chunks of this size. */
export const BOM_AUDIT_UPDATE_CHUNK_SIZE = 1000;

/** Big audits: give the submit transaction enough time (ms). */
export const BOM_AUDIT_SUBMIT_TX_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------- Excel template (one file -> one audit per operator)

/** Optional columns: Operator (one per storage bin) and Audit Name (when given as a column instead of the top cell). */
export const BOM_AUDIT_OPTIONAL_HEADER_ALIASES = {
  operator: ['operator', 'operatorname', 'assignedto', 'user', 'auditor'],
  auditName: ['auditname'],
} as const;

/** Label of the "Audit Name" cell above the table (the value is the next filled cell to its right). */
export const BOM_AUDIT_NAME_LABEL = 'auditname';

/** The header row (Material / Storage / Qty) is searched in the first N rows of the sheet. */
export const BOM_AUDIT_HEADER_SEARCH_ROWS = 20;

/** Template layout (the downloadable Excel). */
export const BOM_AUDIT_TEMPLATE = {
  fileName: 'BOM_Audit_Template.xlsx',
  sheetName: 'BOM Audit',
  operatorSheetName: 'Operators',
  // Row 1 = Audit Name, row 2 = column headers, data from row 3
  headerRowNo: 2,
  firstDataRowNo: 3,
  /** Columns exactly as in the SAP / LX03 export, plus Operator at the end */
  columns: [
    { header: 'Typ', width: 12 }, // wide enough for the "Audit Name" label in A1
    { header: 'StorageBin', width: 14, required: true },
    { header: 'Material', width: 22, required: true, text: true },
    { header: 'Plnt', width: 8 },
    { header: 'Location', width: 10 },
    { header: 'Avail', width: 9, required: true },
    { header: 'Batch', width: 14 },
    { header: 'Stock', width: 9 },
    { header: 'Cert. No.', width: 14 },
    { header: 'GR Date', width: 12 },
    { header: 'GR Number', width: 14 },
    { header: 'Delivery', width: 12 },
    { header: 'Last mvmt', width: 12 },
    { header: 'Last changer', width: 14 },
    { header: 'Operator', width: 38, required: true, operator: true },
  ],
} as const;

/** Operator shown in the template dropdown: "Name (email)" - the email in brackets identifies the user. */
export const formatOperatorLabel = (name: string, email: string) => `${name} (${email})`;
