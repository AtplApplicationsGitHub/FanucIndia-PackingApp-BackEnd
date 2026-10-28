import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../prisma.service';
import { SftpService } from '../../sftp/sftp.service';
import {
  buildAuditFilePath,
  isInsideAuditBaseDir,
} from '../shared/audit-report-paths';
import {
  BOM_AUDIT_LINE_STATUS,
  BOM_AUDIT_REPORT,
  bomAuditReportFileName,
} from './bom-audit.constants';

const LINE_STATUS_LABEL: Record<string, string> = {
  [BOM_AUDIT_LINE_STATUS.VALID]: 'Valid',
  [BOM_AUDIT_LINE_STATUS.MISMATCH]: 'Mismatch',
  [BOM_AUDIT_LINE_STATUS.MISSING]: 'Missing',
  [BOM_AUDIT_LINE_STATUS.UNEXPECTED]: 'Unexpected',
};

const LINE_STATUS_STYLE: Record<string, { fill: string; font: string }> = {
  [BOM_AUDIT_LINE_STATUS.VALID]: { fill: 'FFC6EFCE', font: 'FF006100' },
  [BOM_AUDIT_LINE_STATUS.MISMATCH]: { fill: 'FFFFEB9C', font: 'FF9C5700' },
  [BOM_AUDIT_LINE_STATUS.MISSING]: { fill: 'FFFFC7CE', font: 'FF9C0006' },
  [BOM_AUDIT_LINE_STATUS.UNEXPECTED]: { fill: 'FFE4DFEC', font: 'FF5B2C83' },
};

const REPORT_AUDIT_SELECT = {
  id: true,
  auditNo: true,
  auditName: true,
  status: true,
  fileName: true,
  operatorName: true,
  createdByName: true,
  createdAt: true,
  downloadedAt: true,
  startedAt: true,
  completedAt: true,
  submittedAt: true,
  locations: {
    orderBy: { sequenceNo: 'asc' as const },
    select: {
      sequenceNo: true,
      storageBin: true,
      expectedMaterials: true,
      verifiedAt: true,
      materials: {
        orderBy: [{ isUnexpected: 'asc' as const }, { id: 'asc' as const }],
        select: {
          materialCode: true,
          expectedQty: true,
          actualQty: true,
          lineStatus: true,
          isUnexpected: true,
          lastScannedAt: true,
        },
      },
    },
  },
};

export type BomAuditReportFile = { fileName: string; buffer: Buffer };

@Injectable()
export class BomAuditReportService {
  private readonly logger = new Logger(BomAuditReportService.name);

  private readonly inFlight = new Set<number>();
  private retryRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sftp: SftpService,
  ) {}

  generateInBackground(auditId: number): void {
    void this.generateAndUpload(auditId);
  }

  async generateAndUpload(auditId: number): Promise<boolean> {
    if (this.inFlight.has(auditId)) return false;
    this.inFlight.add(auditId);
    let auditNo = `#${auditId}`;
    try {
      const report = await this.buildReport(auditId);
      auditNo = report.auditNo;
      const remotePath = buildAuditFilePath('BOM_AUDIT', report.auditNo, report.fileName);

      await this.sftp.put(report.buffer, remotePath);

      await this.prisma.bomAudit.update({
        where: { id: auditId },
        data: { reportPath: remotePath, reportGeneratedAt: new Date(), reportError: null },
      });
      this.logger.log(`BOM audit ${report.auditNo}: report saved to SFTP ${remotePath}`);
      return true;
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)) || 'Unknown error';
      this.logger.warn(`BOM audit ${auditNo}: report upload failed (will retry) - ${message}`);
      await this.prisma.bomAudit
        .update({
          where: { id: auditId },
          data: {
            reportError: message.slice(0, BOM_AUDIT_REPORT.maxErrorLength),
            reportAttempts: { increment: 1 },
          },
        })
        .catch((dbErr) =>
          this.logger.error(`BOM audit ${auditNo}: could not save the report error - ${dbErr?.message ?? dbErr}`),
        );
      return false;
    } finally {
      this.inFlight.delete(auditId);
    }
  }

  @Interval(BOM_AUDIT_REPORT.retryIntervalMs)
  async retryPendingReports(): Promise<void> {
    if (this.retryRunning) return;
    this.retryRunning = true;
    try {
      const pending = await this.prisma.bomAudit.findMany({
        where: {
          submittedAt: { not: null },
          reportPath: null,
          reportAttempts: { lt: BOM_AUDIT_REPORT.maxAttempts },
        },
        orderBy: { submittedAt: 'asc' },
        take: BOM_AUDIT_REPORT.retryBatchSize,
        select: { id: true },
      });
      for (const { id } of pending) {
        await this.generateAndUpload(id);
      }
    } catch (err) {
      this.logger.error(`BOM audit report retry failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      this.retryRunning = false;
    }
  }

  async getReportForDownload(auditId: number): Promise<BomAuditReportFile> {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id: auditId },
      select: { id: true, auditNo: true, submittedAt: true, reportPath: true },
    });
    if (!audit) {
      throw new NotFoundException({ code: 'BOM_AUDIT_NOT_FOUND', message: 'BOM audit not found.' });
    }
    if (!audit.submittedAt) {
      throw new ConflictException({
        code: 'BOM_REPORT_NOT_READY',
        message: 'The report is available after the operator submits the audit from the handheld.',
      });
    }

    const fileName = bomAuditReportFileName(audit.auditNo);

    if (audit.reportPath && isInsideAuditBaseDir('BOM_AUDIT', audit.reportPath)) {
      try {
        const data = await this.sftp.getStream(audit.reportPath);
        if (Buffer.isBuffer(data)) return { fileName, buffer: data };
      } catch (err) {
        this.logger.warn(
          `BOM audit ${audit.auditNo}: saved report could not be read from SFTP, building it again - ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    const report = await this.buildReport(auditId);
    this.generateInBackground(auditId);
    return { fileName: report.fileName, buffer: report.buffer };
  }

  async buildReport(auditId: number): Promise<BomAuditReportFile & { auditNo: string }> {
    const audit = await this.prisma.bomAudit.findUnique({
      where: { id: auditId },
      select: REPORT_AUDIT_SELECT,
    });
    if (!audit) {
      throw new NotFoundException({ code: 'BOM_AUDIT_NOT_FOUND', message: 'BOM audit not found.' });
    }

    const counts = { lines: 0, valid: 0, mismatch: 0, missing: 0, unexpected: 0 };
    const perLocation = audit.locations.map((location) => {
      const c = { valid: 0, mismatch: 0, missing: 0, unexpected: 0 };
      for (const m of location.materials) {
        counts.lines += 1;
        if (m.lineStatus === BOM_AUDIT_LINE_STATUS.VALID) c.valid += 1;
        else if (m.lineStatus === BOM_AUDIT_LINE_STATUS.MISMATCH) c.mismatch += 1;
        else if (m.lineStatus === BOM_AUDIT_LINE_STATUS.MISSING) c.missing += 1;
        else if (m.lineStatus === BOM_AUDIT_LINE_STATUS.UNEXPECTED) c.unexpected += 1;
      }
      counts.valid += c.valid;
      counts.mismatch += c.mismatch;
      counts.missing += c.missing;
      counts.unexpected += c.unexpected;
      return { location, ...c };
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DIMS';
    workbook.created = new Date();

    const thin = { style: 'thin' as const, color: { argb: 'FFBFBFBF' } };
    const box = { top: thin, left: thin, bottom: thin, right: thin };
    const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFD966' } };
    const labelFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF2F2F2' } };

    const sheet = workbook.addWorksheet(BOM_AUDIT_REPORT.sheetName);
    const columns = [
      { header: 'S/No', width: 7 },
      { header: 'Storage Bin', width: 16 },
      { header: 'Material Code', width: 24 },
      { header: 'Expected Qty', width: 13 },
      { header: 'Scanned Qty', width: 13 },
      { header: 'Difference', width: 12 },
      { header: 'Status', width: 13 },
      { header: 'Last Scanned', width: 21 },
      { header: 'Location Completed', width: 21 },
    ];
    columns.forEach((c, i) => (sheet.getColumn(i + 1).width = c.width));

    sheet.mergeCells('A1:I1');
    sheet.getCell('A1').value = 'BOM Completeness Audit Report';
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getRow(1).height = 22;

    const details: [string, string, string, string][] = [
      ['Audit No', audit.auditNo, 'Audit Name', audit.auditName],
      ['Operator', audit.operatorName, 'Status', this.titleCase(audit.status)],
      ['Created By', audit.createdByName, 'Created On', this.formatTime(audit.createdAt)],
      ['Uploaded File', audit.fileName, 'Report Generated', this.formatTime(new Date())],
      ['Downloaded On', this.formatTime(audit.downloadedAt), 'Started On', this.formatTime(audit.startedAt)],
      ['Completed On', this.formatTime(audit.completedAt), 'Submitted On', this.formatTime(audit.submittedAt)],
    ];
    let rowNo = 3;
    for (const [l1, v1, l2, v2] of details) {
      sheet.mergeCells(`A${rowNo}:B${rowNo}`);
      sheet.mergeCells(`C${rowNo}:E${rowNo}`);
      sheet.mergeCells(`F${rowNo}:G${rowNo}`);
      sheet.mergeCells(`H${rowNo}:I${rowNo}`);
      for (const [cell, value, isLabel] of [
        [`A${rowNo}`, l1, true],
        [`C${rowNo}`, v1, false],
        [`F${rowNo}`, l2, true],
        [`H${rowNo}`, v2, false],
      ] as [string, string, boolean][]) {
        const c = sheet.getCell(cell);
        c.value = value;
        c.border = box;
        if (isLabel) {
          c.font = { bold: true };
          c.fill = labelFill;
        }
      }
      rowNo += 1;
    }

    rowNo += 1;
    sheet.getCell(`A${rowNo}`).value = 'Summary';
    sheet.getCell(`A${rowNo}`).font = { bold: true, size: 12 };
    rowNo += 1;
    const summary: [string, number, string | null][] = [
      ['Locations', audit.locations.length, null],
      ['Total Lines', counts.lines, null],
      ['Valid', counts.valid, BOM_AUDIT_LINE_STATUS.VALID],
      ['Mismatch', counts.mismatch, BOM_AUDIT_LINE_STATUS.MISMATCH],
      ['Missing', counts.missing, BOM_AUDIT_LINE_STATUS.MISSING],
      ['Unexpected', counts.unexpected, BOM_AUDIT_LINE_STATUS.UNEXPECTED],
    ];
    summary.forEach(([label, value, status], i) => {
      const head = sheet.getCell(rowNo, i + 2);
      const val = sheet.getCell(rowNo + 1, i + 2);
      head.value = label;
      head.font = { bold: true };
      head.alignment = { horizontal: 'center' };
      head.border = box;
      head.fill = labelFill;
      val.value = value;
      val.font = { bold: true, size: 12 };
      val.alignment = { horizontal: 'center' };
      val.border = box;
      if (status) this.applyStatusStyle(head, status);
    });
    rowNo += 3;

    const headerRowNo = rowNo;
    const header = sheet.getRow(headerRowNo);
    columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true };
      cell.fill = headerFill;
      cell.border = box;
      cell.alignment = { vertical: 'middle', horizontal: i >= 3 && i <= 5 ? 'right' : 'left' };
    });
    header.height = 20;

    let serialNo = 0;
    for (const location of audit.locations) {
      const completed = this.formatTime(location.verifiedAt);
      for (const m of location.materials) {
        serialNo += 1;
        const scanned = m.actualQty ?? 0;
        const row = sheet.getRow(headerRowNo + serialNo);
        row.values = [
          serialNo,
          location.storageBin,
          m.materialCode,
          m.expectedQty,
          m.actualQty ?? null,
          m.lineStatus ? scanned - m.expectedQty : null,
          m.lineStatus ? (LINE_STATUS_LABEL[m.lineStatus] ?? m.lineStatus) : '-',
          this.formatTime(m.lastScannedAt),
          completed,
        ];
        row.getCell(3).numFmt = '@';
        row.eachCell({ includeEmpty: true }, (cell) => (cell.border = box));
        if (m.lineStatus) this.applyStatusStyle(row.getCell(7), m.lineStatus);
      }
    }

    sheet.views = [{ state: 'frozen', ySplit: headerRowNo }];
    sheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: `${headerRowNo}:${headerRowNo}`,
    };
    sheet.autoFilter = {
      from: { row: headerRowNo, column: 1 },
      to: { row: headerRowNo + Math.max(serialNo, 1), column: columns.length },
    };

    const locSheet = workbook.addWorksheet(BOM_AUDIT_REPORT.locationSheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const locColumns = [
      { header: 'Seq', width: 6 },
      { header: 'Storage Bin', width: 16 },
      { header: 'Expected Materials', width: 19 },
      { header: 'Valid', width: 9, status: BOM_AUDIT_LINE_STATUS.VALID },
      { header: 'Mismatch', width: 11, status: BOM_AUDIT_LINE_STATUS.MISMATCH },
      { header: 'Missing', width: 10, status: BOM_AUDIT_LINE_STATUS.MISSING },
      { header: 'Unexpected', width: 12, status: BOM_AUDIT_LINE_STATUS.UNEXPECTED },
      { header: 'Completed On', width: 21 },
    ];
    locColumns.forEach((c, i) => {
      locSheet.getColumn(i + 1).width = c.width;
      const cell = locSheet.getCell(1, i + 1);
      cell.value = c.header;
      cell.font = { bold: true };
      cell.fill = headerFill;
      cell.border = box;
    });
    locSheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    perLocation.forEach((p, i) => {
      const row = locSheet.getRow(i + 2);
      row.values = [
        p.location.sequenceNo,
        p.location.storageBin,
        p.location.expectedMaterials,
        p.valid,
        p.mismatch,
        p.missing,
        p.unexpected,
        this.formatTime(p.location.verifiedAt),
      ];
      row.eachCell({ includeEmpty: true }, (cell) => (cell.border = box));
    });

    return {
      auditNo: audit.auditNo,
      fileName: bomAuditReportFileName(audit.auditNo),
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    };
  }

  private readonly timeFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: BOM_AUDIT_REPORT.timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  private formatTime(value: Date | null | undefined): string {
    return value ? this.timeFormat.format(value).replace(',', '') : '-';
  }

  private titleCase(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private applyStatusStyle(cell: ExcelJS.Cell, status: string) {
    const style = LINE_STATUS_STYLE[status];
    if (!style) return;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
    cell.font = { ...(cell.font ?? {}), bold: true, color: { argb: style.font } };
  }
}
