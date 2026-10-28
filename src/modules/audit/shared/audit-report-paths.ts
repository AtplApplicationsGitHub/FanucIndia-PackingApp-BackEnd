import * as path from 'path';

export const AUDIT_REPORT_TYPES = {
  BOM_AUDIT: { env: 'SFTP_BASE_DIR_BOM_AUDIT', defaultDir: 'uploads/fanuc/audit/bom-audit' },
  // Next audit modules (not used yet)
  CYCLE_COUNT: { env: 'SFTP_BASE_DIR_CYCLE_COUNT', defaultDir: 'uploads/fanuc/audit/cycle-count' },
  LOCATION_AUDIT: { env: 'SFTP_BASE_DIR_LOCATION_AUDIT', defaultDir: 'uploads/fanuc/audit/location-audit' },
  FREE_STOCK: { env: 'SFTP_BASE_DIR_FREE_STOCK', defaultDir: 'uploads/fanuc/audit/free-stock' },
} as const;

export type AuditReportType = keyof typeof AUDIT_REPORT_TYPES;

const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

export function getAuditBaseDir(type: AuditReportType): string {
  const { env, defaultDir } = AUDIT_REPORT_TYPES[type];
  const configured = (process.env[env] ?? '').trim().replace(/\\/g, '/');
  const dir = path.posix.normalize(configured || defaultDir).replace(/\/+$/, '');
  if (!dir || dir === '.' || dir.split('/').includes('..')) {
    throw new Error(`Invalid SFTP folder in ${env}: "${configured}"`);
  }
  return dir;
}

export function buildAuditFilePath(type: AuditReportType, auditNo: string, fileName: string): string {
  if (!SAFE_NAME.test(auditNo) || !SAFE_NAME.test(fileName) || auditNo.startsWith('.')) {
    throw new Error(`Invalid audit folder / file name: "${auditNo}/${fileName}"`);
  }
  return path.posix.join(getAuditBaseDir(type), auditNo, fileName);
}

export function isInsideAuditBaseDir(type: AuditReportType, remotePath: string): boolean {
  const base = getAuditBaseDir(type);
  const normalized = path.posix.normalize(remotePath.replace(/\\/g, '/'));
  return normalized.startsWith(`${base}/`) && !normalized.split('/').includes('..');
}
