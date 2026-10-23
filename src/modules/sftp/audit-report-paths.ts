import * as path from 'path';

/*
 * SFTP folders for the audit REPORT files (Phase 2 - RFID / Barcode warehouse audits).
 * Each audit type has its own base folder, set in .env; inside it, one folder per audit (named by the Audit No):
 *
 *   <base folder>/<Audit No>/<Audit No>_Report.xlsx
 *   e.g. uploads/fanuc/audit/bom-audit/AUD-BOM-2026-0010/AUD-BOM-2026-0010_Report.xlsx
 *
 * The default folder is used only when the .env value is missing.
 */
export const AUDIT_REPORT_TYPES = {
  BOM_AUDIT: { env: 'SFTP_BASE_DIR_BOM_AUDIT', defaultDir: 'uploads/fanuc/audit/bom-audit' },
  // Next audit modules (not used yet)
  CYCLE_COUNT: { env: 'SFTP_BASE_DIR_CYCLE_COUNT', defaultDir: 'uploads/fanuc/audit/cycle-count' },
  LOCATION_AUDIT: { env: 'SFTP_BASE_DIR_LOCATION_AUDIT', defaultDir: 'uploads/fanuc/audit/location-audit' },
  FREE_STOCK: { env: 'SFTP_BASE_DIR_FREE_STOCK', defaultDir: 'uploads/fanuc/audit/free-stock' },
} as const;

export type AuditReportType = keyof typeof AUDIT_REPORT_TYPES;

/** Only letters, digits, "." "_" "-" - an Audit No like AUD-BOM-2026-0010 can never escape its folder */
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

/** Base SFTP folder of an audit type, e.g. "uploads/fanuc/audit/bom-audit" (no trailing "/"). */
export function getAuditBaseDir(type: AuditReportType): string {
  const { env, defaultDir } = AUDIT_REPORT_TYPES[type];
  const configured = (process.env[env] ?? '').trim().replace(/\\/g, '/');
  const dir = path.posix.normalize(configured || defaultDir).replace(/\/+$/, '');
  if (!dir || dir === '.' || dir.split('/').includes('..')) {
    throw new Error(`Invalid SFTP folder in ${env}: "${configured}"`);
  }
  return dir;
}

/** Full SFTP path of one audit's file: <base>/<auditNo>/<fileName> */
export function buildAuditFilePath(type: AuditReportType, auditNo: string, fileName: string): string {
  if (!SAFE_NAME.test(auditNo) || !SAFE_NAME.test(fileName) || auditNo.startsWith('.')) {
    throw new Error(`Invalid audit folder / file name: "${auditNo}/${fileName}"`);
  }
  return path.posix.join(getAuditBaseDir(type), auditNo, fileName);
}

/** true when the path is inside the base folder of the audit type (checked before reading a saved path). */
export function isInsideAuditBaseDir(type: AuditReportType, remotePath: string): boolean {
  const base = getAuditBaseDir(type);
  const normalized = path.posix.normalize(remotePath.replace(/\\/g, '/'));
  return normalized.startsWith(`${base}/`) && !normalized.split('/').includes('..');
}
