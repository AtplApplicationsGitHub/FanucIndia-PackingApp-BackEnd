import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Workbook } from 'exceljs';
import { Prisma } from '@prisma/client';
import { SftpService } from '../sftp/sftp.service';
import * as path from 'path';
import { Response } from 'express';
import { Cron, Interval } from '@nestjs/schedule';
import AdmZip from 'adm-zip';
import { getSingleDateOnlyRange } from '../../common/utils/date-only.util';

const columnMapping = {
  'SO Number': 'saleOrderNumber',
  'Transfer Order': 'transferOrder',
  'FG OBD': 'FG_OBD',
  'Machine Model': 'Machine_Model',
  'CNC Serial No': 'CNC_Serial_No',
  'Material Code': 'Material_Code',
  'Material Description': 'Material_Description',
  'Batch No': 'Batch_No',
  'SO Donor Batch': 'SO_Donor_Batch',
  'Certificate No': 'Cert_No',
  'Bin No': 'Bin_No',
  'A D F': 'A_D_F',
  'Required Quantity': 'Required_Qty',
  'Issue Stage': 'Issue_stage',
  'Packing Stage': 'Packing_stage',
  Remarks: 'Remarks',

  'MATERIAL GROUP': 'Material_Group',
  NAME: 'NAME',
  NAME2: 'NAME2',
  STREET1: 'STREET1',
  STREET2: 'STREET2',
  STREET3: 'STREET3',
  STREET4: 'STREET4',
  CITY: 'CITY',
  STATE: 'STATE',
  COUNTRY: 'COUNTRY',
  POSTAL: 'POSTAL',

  STATUS: 'STATUS',
};

@Injectable()
export class ErpMaterialImporterService {
  private readonly logger = new Logger(ErpMaterialImporterService.name);

  constructor(
    private prisma: PrismaService,
    private sftpService: SftpService,
  ) {}

  /**
   * Helper method to unzip an xlsx buffer, repair malformed XML (e.g., unescaped &, <, >),
   * and return a repaired xlsx buffer.
   */
  private repairCorruptedExcelBuffer(buffer: Buffer): Buffer {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      let repairedCount = 0;

      zipEntries.forEach((zipEntry) => {
        // Only process XML files inside the zipped xlsx (usually xl/sharedStrings.xml causes this)
        if (zipEntry.entryName.endsWith('.xml')) {
          let originalContent = zipEntry.getData().toString('utf8');
          let repairedContent = originalContent;

          // STEP 1: Fix unescaped Ampersands (&) globally.
          // Safe because we use a lookahead to ignore already valid XML entities.
          repairedContent = repairedContent.replace(
            /&(?!(amp|lt|gt|quot|apos|#\d+|#x[a-fA-F\d]+);)/g,
            '&amp;',
          );

          // STEP 2: Fix unescaped Less-Than (<) and Greater-Than (>)
          // We target ONLY the data sitting inside Excel text tags: <t> ... </t>
          // The 's' flag allows the regex to match across multiple lines if needed.
          repairedContent = repairedContent.replace(
            /<t([^>]*)>(.*?)<\/t>/gs,
            (match, attributes, innerText) => {
              // Sanitize the actual text content by escaping dangerous characters
              const sanitizedText = innerText
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');

              // Reconstruct the XML tag with the clean text
              return `<t${attributes}>${sanitizedText}</t>`;
            },
          );

          if (originalContent !== repairedContent) {
            // Update the file in the zip archive if changes were made
            zip.updateFile(
              zipEntry.entryName,
              Buffer.from(repairedContent, 'utf8'),
            );
            repairedCount++;
          }
        }
      });

      if (repairedCount > 0) {
        this.logger.log(
          `Repaired XML special characters in ${repairedCount} internal file(s).`,
        );
      }

      // Return the newly packed zip buffer
      return zip.toBuffer();
    } catch (e) {
      this.logger.error('Failed to execute buffer repair logic', e);
      // If our repair logic fails, return the original buffer so standard errors can surface
      return buffer;
    }
  }

  @Interval(parseInt(process.env.SFTP_SCAN_INTERVAL_MS || '300000'))
  async autoProcessActiveFolder() {
    const nowUtc = new Date();
    const istTime = new Date(nowUtc.getTime() + 5.5 * 60 * 60 * 1000);
    const currentHourIst = istTime.getUTCHours();

    if (currentHourIst < 7 || currentHourIst >= 24) {
      return;
    }

    this.logger.log(
      'Running automated scheduled scan of SFTP active folder...',
    );

    // const baseDir =
    //   process.env.SFTP_BASE_DIR_DRIVE || 'uploads/fanuc/samba_mount_drive';
    // const activeDir = path.posix.join(baseDir, 'active');

    try {
      // const files = (await this.sftpService.list(activeDir)) as Array<{
      //   type: string;
      //   name: string;
      // }>;
      // const soNumbersFromFiles: string[] = [];

      // for (const file of files) {
      //   if (file.type !== '-' || !file.name.endsWith('.xlsx')) {
      //     continue;
      //   }

      //   const baseName = file.name.replace('.xlsx', '');
      //   const nameParts = baseName.split('_');

      //   if (nameParts.length !== 2) {
      //     continue;
      //   }

      //   soNumbersFromFiles.push(nameParts[0]);
      // }

      const year = istTime.getUTCFullYear();
      const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
      const date = String(istTime.getUTCDate()).padStart(2, '0');

      const todayYmd = `${year}-${month}-${date}`;
      const deliveryDateRange = getSingleDateOnlyRange(todayYmd);

      const eligibleOrders = await this.prisma.salesOrder.findMany({
        where: {
          deliveryDate: deliveryDateRange,
        },
        select: { saleOrderNumber: true },
      });

      const validSoNumbers = [
        ...new Set(eligibleOrders.map((o) => o.saleOrderNumber)),
      ];

      if (validSoNumbers.length > 0) {
        this.logger.log(
          `Auto-scan found ${validSoNumbers.length} eligible orders for today's delivery date.`,
        );

        const result = await this.bulkImportFromDrive(
          validSoNumbers,
          'System Auto Job',
        );

        const logsToInsert = result.summary
          .filter((s: any) => s.status !== 'Skipped')
          .map((s: any) => ({
            saleOrderNumber: s.soNumber,
            status: s.status,
            message: s.reason,
            createdAt: new Date(),
          }));

        if (logsToInsert.length > 0) {
          await this.prisma.eRP_Data_Cron_Logs.createMany({
            data: logsToInsert,
          });
        }

        this.logger.log(
          `Auto-scan bulk import completed. Summary: ${JSON.stringify(result.summary)}`,
        );
      } else {
        this.logger.log(`No eligible orders found for today's delivery date.`);
      }
    } catch (error) {
      this.logger.error('Failed to execute automated SFTP folder scan.', error);
    }
  }

  @Cron(process.env.ARCHIVE_CLEANUP_CRON || '0 12 * * *', {
    timeZone: process.env.ARCHIVE_CLEANUP_TIMEZONE || 'Asia/Kolkata',
  })
  async cleanupOldArchiveFiles() {
    this.logger.log('Running scheduled cleanup of SFTP archive folder...');

    const baseDir =
      process.env.SFTP_BASE_DIR_DRIVE || 'uploads/fanuc/samba_mount_drive';
    const archiveDir = path.posix.join(baseDir, 'archive');

    const cleanupDays = parseInt(process.env.ARCHIVE_CLEANUP_DAYS || '30', 10);
    const cleanupDaysMs = cleanupDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - cleanupDaysMs;

    try {
      const files = (await this.sftpService.list(archiveDir)) as Array<{
        type: string;
        name: string;
        modifyTime?: number;
        accessTime?: number;
        mtime?: number;
        modifyTimeMs?: number;
        mtimeMs?: number;
      }>;

      let deletedCount = 0;

      for (const file of files) {
        if (file.type !== '-' || !file.name.endsWith('.xlsx')) {
          continue;
        }

        const fileTime =
          file.modifyTime ||
          file.accessTime ||
          (file as any).mtime ||
          (file as any).modifyTimeMs ||
          (file as any).mtimeMs;

        if (!fileTime) {
          this.logger.warn(
            `Skipping archive cleanup for ${file.name}: no valid timestamp found.`,
          );
          continue;
        }

        if (fileTime <= cutoffTime) {
          const filePath = path.posix.join(archiveDir, file.name);
          await this.sftpService.delete(filePath);
          deletedCount++;

          this.logger.log(
            `Deleted archive file older than ${cleanupDays} days: ${file.name}`,
          );
        }
      }

      this.logger.log(
        `Archive cleanup completed. Deleted ${deletedCount} file(s) older than ${cleanupDays} days.`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup old archive files.', error);
    }
  }

  async importFromDrive(
    saleOrderNumber: string,
    username: string,
    obdOverride?: string,
  ) {
    this.logger.log(`Initiating Drive Import for SO: ${saleOrderNumber}`);

    const so = await this.prisma.salesOrder.findFirst({
      where: { saleOrderNumber },
      select: { id: true, outboundDelivery: true },
    });

    if (!so) {
      throw new BadRequestException(
        `Sales Order not found: ${saleOrderNumber}`,
      );
    }

    const obdToUse = obdOverride || so.outboundDelivery;
    if (!obdToUse) {
      throw new BadRequestException(
        `Outbound Delivery (OBD) not found for SO: ${saleOrderNumber}`,
      );
    }

    if (obdOverride && obdOverride !== so.outboundDelivery) {
      await this.prisma.salesOrder.update({
        where: { id: so.id },
        data: { outboundDelivery: obdOverride },
      });
      this.logger.log(
        `Corrected OBD for SO ${saleOrderNumber}: '${so.outboundDelivery}' -> '${obdOverride}'`,
      );
    }

    const baseDir =
      process.env.SFTP_BASE_DIR_DRIVE || 'uploads/fanuc/samba_mount_drive';

    // Ensure we use POSIX paths for SFTP
    const activeDir = path.posix.join(baseDir, 'active');
    const archivedDir = path.posix.join(baseDir, 'archive');
    const errorDir = path.posix.join(baseDir, 'error');

    const filename = `${saleOrderNumber}_${obdToUse}.xlsx`;
    const filePath = path.posix.join(activeDir, filename);

    this.logger.log(`Looking for file at SFTP path: ${filePath}`);

    const exists = await this.sftpService.exists(filePath);
    if (!exists) {
      throw new NotFoundException(
        `File '${filename}' not found in Active folder on SFTP server. Path: ${filePath}`,
      );
    }

    let fileBuffer: Buffer;
    try {
      // [CORRECTED LINE]: Use sftpService to download the buffer
      fileBuffer = await this.sftpService.getBuffer(filePath);
    } catch (err) {
      this.logger.error(`Failed to read file from SFTP: ${filePath}`, err);
      throw new InternalServerErrorException(
        'Failed to read the file from drive.',
      );
    }

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: fileBuffer,
      size: fileBuffer.length,
      destination: activeDir,
      filename: filename,
      path: filePath,
      stream: null as any,
    };

    try {
      const result = await this.processFile(
        mockFile,
        saleOrderNumber,
        username,
      );

      await this.prisma.eRP_Data_Cron_Logs.create({
        data: {
          saleOrderNumber: `${saleOrderNumber}_${obdToUse}`,
          status: 'Success',
          message: 'Imported successfully - MANUAL',
          createdAt: new Date(),
        },
      });

      const archivePath = path.posix.join(archivedDir, filename);

      if (await this.sftpService.exists(archivePath)) {
        await this.sftpService.delete(archivePath);
      }

      await this.sftpService.rename(filePath, archivePath);
      this.logger.log(
        `Moved file to SFTP Archive (Overwrite allowed): ${archivePath}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Import failed for ${filename}. Moving to SFTP Error folder.`,
        error,
      );
      try {
        const errorPath = path.posix.join(errorDir, filename);

        if (await this.sftpService.exists(errorPath)) {
          await this.sftpService.delete(errorPath);
        }

        await this.sftpService.rename(filePath, errorPath);
        this.logger.log(
          `Moved file to SFTP Error (Overwrite allowed): ${errorPath}`,
        );
      } catch (moveErr) {
        this.logger.error(
          `Failed to move file ${filename} to Error folder on SFTP`,
          moveErr,
        );
      }
      throw error;
    }
  }

  async processFile(
    file: Express.Multer.File,
    expectedSaleOrderNumber?: string,
    username: string = 'ERP Import',
    logToCronTable: boolean = false,
  ) {
    this.logger.log(`Starting to process file: ${file.originalname}`);

    const records = await this.readFile(file);

    const validationError = await this.validateRecords(
      records,
      expectedSaleOrderNumber,
    );
    if (validationError) {
      this.logger.error(
        `Validation failed for ${file.originalname}: ${validationError}`,
      );
      throw new BadRequestException(validationError);
    }

    const renamedRecords = this.renameColumns(records);
    await this.upsertRecords(renamedRecords, username);

    const soNumber = String(records[0]['SO Number']);
    try {
      await this.prisma.eRPMaterialLog.create({
        data: {
          dateTime: new Date(),
          fileName: file.originalname,
          exceptionStatus: 'Success',
          soNo: soNumber,
          noOfFilesExecuted: 1,
        },
      });

      if (logToCronTable) {
        const obd = String(records[0]['FG OBD']);

        await this.prisma.eRP_Data_Cron_Logs.create({
          data: {
            saleOrderNumber: `${soNumber}_${obd}`,
            status: 'Success',
            message: 'Imported successfully - MANUAL',
            createdAt: new Date(),
          },
        });
      }

      this.logger.log(`Successfully logged import for SO: ${soNumber}`);
    } catch (logError) {
      this.logger.error(
        `Failed to write to ERPMaterialLog for SO: ${soNumber}`,
        logError,
      );
    }

    this.logger.log(`Successfully processed file: ${file.originalname}`);
    return {
      message: `File processed successfully. ${renamedRecords.length} records upserted.`,
    };
  }

  async bulkImportFromDrive(
    saleOrderNumbers: string[],
    username: string,
    dateRange?: { gte: Date; lt?: Date; lte?: Date },
    logManualToCronTable: boolean = false,
  ) {
    this.logger.log(
      `Initiating Bulk Drive Import for ${saleOrderNumbers.length} SOs`,
    );

    const results: { soNumber: string; status: string; reason: string }[] = [];
    const baseDir =
      process.env.SFTP_BASE_DIR_DRIVE || 'uploads/fanuc/samba_mount_drive';
    const activeDir = path.posix.join(baseDir, 'active');
    const archivedDir = path.posix.join(baseDir, 'archive');
    const errorDir = path.posix.join(baseDir, 'error');

    const uniqueSoNumbers = [...new Set(saleOrderNumbers)];

    const whereClause: Prisma.SalesOrderWhereInput = {
      saleOrderNumber: { in: uniqueSoNumbers },
    };

    if (dateRange) {
      whereClause.deliveryDate = {
        gte: dateRange.gte,
        ...(dateRange.lt ? { lt: dateRange.lt } : {}),
        ...(dateRange.lte ? { lte: dateRange.lte } : {}),
      };
    }

    const salesOrders = await this.prisma.salesOrder.findMany({
      where: whereClause,
      select: {
        saleOrderNumber: true,
        outboundDelivery: true,
        isErpImported: true,
        _count: { select: { materialData: true } },
      },
    });

    for (const so of salesOrders) {
      const soNumber = so.saleOrderNumber;
      const obd = so.outboundDelivery;

      const displayId = obd ? `${soNumber}_${obd}` : soNumber;

      if (so.isErpImported === 1 || so._count.materialData > 0) {
        results.push({
          soNumber: displayId,
          status: 'Skipped',
          reason: 'Data already imported',
        });
        continue;
      }

      if (!obd) {
        results.push({
          soNumber: displayId,
          status: 'Skipped',
          reason: 'Outbound Delivery (OBD) missing in system',
        });
        continue;
      }

      const filename = `${soNumber}_${obd}.xlsx`;
      const filePath = path.posix.join(activeDir, filename);

      try {
        const exists = await this.sftpService.exists(filePath);
        if (!exists) {
          results.push({
            soNumber: displayId,
            status: 'Skipped',
            reason: `File not found: ${filename}`,
          });
          continue;
        }
        const fileBuffer = await this.sftpService.getBuffer(filePath);
        const mockFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: fileBuffer,
          size: fileBuffer.length,
          destination: activeDir,
          filename: filename,
          path: filePath,
          stream: null as any,
        };

        await this.processFile(mockFile, soNumber, username);

        const archivePath = path.posix.join(archivedDir, filename);
        if (await this.sftpService.exists(archivePath)) {
          await this.sftpService.delete(archivePath);
        }
        await this.sftpService.rename(filePath, archivePath);

        results.push({
          soNumber: displayId,
          status: 'Success',
          reason: 'Imported successfully',
        });
        if (logManualToCronTable) {
          await this.prisma.eRP_Data_Cron_Logs.create({
            data: {
              saleOrderNumber: displayId,
              status: 'Success',
              message: 'Imported successfully - MANUAL',
              createdAt: new Date(),
            },
          });
        }
      } catch (error) {
        this.logger.error(`Bulk import error for ${displayId}`, error);

        try {
          const exists = await this.sftpService.exists(filePath);
          if (exists) {
            const errorPath = path.posix.join(errorDir, filename);
            if (await this.sftpService.exists(errorPath)) {
              await this.sftpService.delete(errorPath);
            }
            await this.sftpService.rename(filePath, errorPath);
          }
        } catch (moveErr) {
          this.logger.error(
            `Failed to move file ${filename} to Error folder`,
            moveErr,
          );
        }

        results.push({
          soNumber: displayId,
          status: 'Failed',
          reason: error instanceof Error ? error.message : 'Processing failed',
        });
      }
    }

    return {
      message: 'Bulk import process completed',
      summary: results,
    };
  }

  private async readFile(file: Express.Multer.File): Promise<any[]> {
    const workbook = new Workbook();

    try {
      await workbook.xlsx.load(file.buffer as any);
    } catch (error) {
      this.logger.warn(
        `Initial parse failed for ${file.originalname}. Attempting XML repair for invalid characters...`,
      );

      try {
        const repairedBuffer = this.repairCorruptedExcelBuffer(file.buffer);
        await workbook.xlsx.load(repairedBuffer as any);
        this.logger.log(
          `Successfully repaired and parsed ${file.originalname}`,
        );
      } catch (repairError) {
        this.logger.error(
          'Failed to read or parse the Excel file even after repair attempt.',
          repairError,
        );
        throw new BadRequestException(
          'Invalid or corrupted file. Even fallback repair failed. Please upload a valid .xlsx file.',
        );
      }
    }

    try {
      const worksheet = workbook.worksheets[0];

      if (!worksheet) return [];

      const jsonData: any[] = [];
      const headers: string[] = [];

      const headerLookup = new Map<string, string>();
      Object.keys(columnMapping).forEach((key) => {
        headerLookup.set(key.toLowerCase(), key);
      });

      // const skipRows = parseInt(process.env.ERP_IMPORT_SKIP_ROWS || '1', 10);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell, colNumber) => {
            const cellText = cell.text ? cell.text.trim() : '';
            const lowerText = cellText.toLowerCase();

            const canonicalHeader = headerLookup.get(lowerText) || cellText;

            headers[colNumber] = canonicalHeader;
          });
          // } else if (rowNumber <= skipRows) {
          //   return;
        } else {
          const rowData: any = {};
          let hasData = false;

          headers.forEach((header, colNumber) => {
            if (!header) return;

            const cell = row.getCell(colNumber);
            let val = cell.value;

            if (val && typeof val === 'object') {
              if ('text' in val) val = (val as any).text;
              else if ('result' in val) val = (val as any).result;
            }

            if (typeof val === 'string') {
              val = val.trim();
            }

            rowData[header] = val !== undefined && val !== null ? val : null;

            if (rowData[header] !== null) hasData = true;
          });

          if (hasData) {
            if (rowNumber === 2) {
              const matCode = String(rowData['Material Code'] || '').trim();

              if (/^[0-9]/.test(matCode)) {
                return;
              }
            }

            jsonData.push(rowData);
          }
        }
      });

      return jsonData;
    } catch (error) {
      this.logger.error(
        'Failed to map rows after parsing the Excel file.',
        error,
      );
      throw new BadRequestException(
        'Failed to extract data from the file. Please check row and column structures.',
      );
    }
  }

  private async validateRecords(
    records: any[],
    expectedSaleOrderNumber?: string,
  ): Promise<string | null> {
    if (records.length === 0) {
      return 'File is empty.';
    }

    const optionalHeaders = new Set<string>([
      'STATUS',
      'Status',
      'COUNTRY',
      'Remarks',
      'REMARKS',
    ]);
    const expectedHeaders = Object.keys(columnMapping).filter(
      (h) => !optionalHeaders.has(h),
    );
    const actualHeaders = Object.keys(records[0]);

    const missingHeaders = expectedHeaders.filter(
      (h) => !actualHeaders.includes(h),
    );
    if (missingHeaders.length > 0) {
      return `Header mismatch. Missing columns: ${missingHeaders.join(', ')}`;
    }

    const matCodeHeader = 'Material Code';
    for (const record of records) {
      if (!record[matCodeHeader]) {
        return 'Missing Material Code in one or more rows.';
      }
    }

    const soNumberHeader = 'SO Number';
    const soNumbers = new Set(
      records.map((r) => r[soNumberHeader]).filter(Boolean),
    );
    if (soNumbers.size > 1) {
      return 'Inconsistent SO Numbers found in the file. All records must belong to the same SO Number.';
    }

    const soNumberValue = soNumbers.values().next().value;
    if (!soNumberValue) {
      return 'Missing SO Number in one or more rows.';
    }
    const soNumber = String(soNumberValue);

    if (expectedSaleOrderNumber && soNumber !== expectedSaleOrderNumber) {
      return `The SO Number in the file ('${soNumber}') does not match the expected SO Number ('${expectedSaleOrderNumber}').`;
    }

    const obdHeader = 'FG OBD';
    const obds = new Set(records.map((r) => r[obdHeader]).filter(Boolean));
    if (obds.size > 1) {
      return 'Inconsistent FG OBD found in the file. All records must belong to the same Outbound Delivery.';
    }

    const obdValue = obds.values().next().value;
    if (!obdValue) {
      return 'Missing FG OBD in one or more rows.';
    }
    const obd = String(obdValue);

    const orderExists = await this.prisma.salesOrder.findFirst({
      where: { saleOrderNumber: soNumber, outboundDelivery: obd },
    });

    if (!orderExists) {
      return `Sales Order '${soNumber}' with Outbound Delivery '${obd}' does not exist in the system.`;
    }

    return null;
  }

  private renameColumns(records: any[]): any[] {
    return records.map((record) => {
      const newRecord: { [key: string]: any } = {};
      for (const key of Object.keys(
        columnMapping,
      ) as (keyof typeof columnMapping)[]) {
        newRecord[columnMapping[key]] = record[key];
      }
      return newRecord;
    });
  }

  private async upsertRecords(records: any[], username: string) {
    if (records.length === 0) return;

    const soNumber = String(records[0].saleOrderNumber);
    const obd = String(records[0].FG_OBD);

    this.logger.log(
      `Upserting ${records.length} records for SO: ${soNumber}, OBD: ${obd}`,
    );

    const exactSo = await this.prisma.salesOrder.findFirst({
      where: { saleOrderNumber: soNumber, outboundDelivery: obd },
      select: { id: true },
    });

    if (!exactSo) {
      throw new BadRequestException(
        `Sales Order '${soNumber}' with OBD '${obd}' does not exist.`,
      );
    }

    const safeParseInt = (
      val: any,
      defaultVal: number | null = null,
    ): number | null => {
      if (val === null || val === undefined || String(val).trim() === '')
        return defaultVal;
      const num = parseInt(String(val), 10);
      return isNaN(num) ? defaultVal : num;
    };

    const safeToString = (
      val: any,
      defaultVal: string | null = null,
    ): string | null => {
      if (val === null || val === undefined) return defaultVal;
      return String(val).trim();
    };

    const allCodes = records
      .map((r) => safeToString(r.Material_Code, ''))
      .filter((code): code is string => !!code);

    const distinctCodesToLookup = [...new Set(allCodes)];

    const materialBarcodes =
      distinctCodesToLookup.length > 0
        ? await this.prisma.materialBarcode.findMany({
            where: { erpCode: { in: distinctCodesToLookup } },
          })
        : [];

    const barcodeMap = new Map(materialBarcodes.map((mb) => [mb.erpCode, mb]));

    const buildCustomerName = (name1: any, name2: any): string => {
      const a = safeToString(name1, '') || '';
      const b = safeToString(name2, '') || '';
      const rawName = [a, b].filter(Boolean).join(' ');
      return rawName.trim().replace(/\s+/g, ' ');
    };

    const ensureComma = (val: string): string => {
      const trimmed = val.trim();
      if (!trimmed) return trimmed;
      return trimmed.endsWith(',') ? trimmed : `${trimmed},`;
    };

    const buildCustomerAddress = (r: any): string => {
      const street1 = safeToString(r.STREET1, '') || '';
      const street2 = safeToString(r.STREET2, '') || '';
      const street3 = safeToString(r.STREET3, '') || '';
      const street4 = safeToString(r.STREET4, '') || '';
      const city = safeToString(r.CITY, '') || '';
      const state = safeToString(r.STATE, '') || '';
      const postal = safeToString(r.POSTAL, '') || '';

      const parts = [
        street1 ? ensureComma(street1) : '',
        street2 ? ensureComma(street2) : '',
        street3 ? ensureComma(street3) : '',
        street4 ? ensureComma(street4) : '',
        city ? ensureComma(city) : '',
        state ? ensureComma(state) : '',
        postal,
      ]
        .map((p) => (typeof p === 'string' ? p.trim() : ''))
        .filter(Boolean);

      const rawAddress = parts.join(' ');
      return rawAddress.trim().replace(/\s+/g, ' ');
    };

    const firstRow = records[0];
    const computedCustomerName = buildCustomerName(
      firstRow.NAME,
      firstRow.NAME2,
    );
    const computedCustomerAddress = buildCustomerAddress(firstRow);

    const recordsToCreate = records.map((r) => {
      const matCode = safeToString(r.Material_Code, '')!;
      const barcodeData = barcodeMap.get(matCode);
      const excelGroup = safeToString(r.Material_Group);

      return {
        saleOrderNumber: safeToString(r.saleOrderNumber)!,
        transferOrder: safeToString(r.transferOrder),
        FG_OBD: safeToString(r.FG_OBD),
        Machine_Model: safeToString(r.Machine_Model),
        CNC_Serial_No: safeToString(r.CNC_Serial_No),
        Material_Code: matCode,
        Material_Description: safeToString(r.Material_Description, '')!,
        Batch_No: safeToString(r.Batch_No, '')!,
        SO_Donor_Batch: safeToString(r.SO_Donor_Batch, '')!,
        Cert_No: safeToString(r.Cert_No, '')!,
        Bin_No: safeToString(r.Bin_No, '')!,
        A_D_F: safeToString(r.A_D_F, '')!,
        Required_Qty: safeParseInt(r.Required_Qty, 0)!,
        Issue_stage: safeParseInt(r.Issue_stage, 0)!,
        Packing_stage: safeParseInt(r.Packing_stage, 0)!,
        Remarks: safeToString(r.Remarks),

        Mapping_Barcode: barcodeData?.mappingBarcode ?? null,
        Group: excelGroup ? excelGroup : (barcodeData?.group ?? null),
        Accept_Bulk_Data: barcodeData?.acceptBulkData ?? null,
        Remarks_Required: barcodeData?.remarksRequired ?? null,
        Classification: barcodeData?.classification ?? null,

        salesOrderId: exactSo.id,
      };
    });

    const uniqueBins = new Set(
      recordsToCreate
        .map((r) => r.Bin_No)
        .filter(
          (bin) => bin !== null && bin !== undefined && bin.trim() !== '',
        ),
    );
    const binCount = uniqueBins.size;

    try {
      await this.prisma.$transaction(async (tx) => {
        const so = await tx.salesOrder.findFirst({
          where: { id: exactSo.id },
          select: { id: true },
        });

        if (!so) {
          throw new BadRequestException(
            `Sales Order Number '${soNumber}' does not exist in the system.`,
          );
        }

        const updateData: Prisma.SalesOrderUpdateInput = {
          UpdatedBy: username,
          UpdatedDate: new Date(),
          isErpImported: 1,
          binCount: binCount,
        };

        if (computedCustomerName) {
          let existingCustomer = await tx.customer.findFirst({
            where: {
              name: { equals: computedCustomerName, mode: 'insensitive' },
              address: computedCustomerAddress
                ? { equals: computedCustomerAddress, mode: 'insensitive' }
                : undefined,
            },
          });

          if (!existingCustomer) {
            existingCustomer = await tx.customer.create({
              data: {
                name: computedCustomerName,
                address: computedCustomerAddress || null,
              },
            });
          } else if (
            computedCustomerAddress &&
            existingCustomer.address !== computedCustomerAddress
          ) {
            existingCustomer = await tx.customer.update({
              where: { id: existingCustomer.id },
              data: { address: computedCustomerAddress },
            });
          }

          updateData.customer = { connect: { id: existingCustomer.id } };
          updateData.customerNameText = null;
        }

        if (computedCustomerAddress) {
          updateData.address = computedCustomerAddress;
        }

        await tx.salesOrder.update({
          where: { id: so.id },
          data: updateData,
        });

        this.logger.log(
          `Deleting existing records for SO: ${soNumber}, OBD: ${obd}`,
        );
        await tx.eRP_Material_Data.deleteMany({
          where: { salesOrderId: exactSo.id },
        });

        this.logger.log(
          `Inserting new records for SO: ${soNumber}, OBD: ${obd}`,
        );
        await tx.eRP_Material_Data.createMany({
          data: recordsToCreate,
        });
      });
    } catch (e) {
      this.logger.error(`Database transaction failed for SO: ${soNumber}`, e);
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          this.logger.warn(
            'Prisma FK constraint error encountered during ERP material import; proceeding to surface generic error without customer-id hint.',
          );
        }
      }
      throw new InternalServerErrorException('Database transaction failed.');
    }
  }

  async bulkDownloadFromDrive(saleOrderNumbers: string[], res: Response) {
    this.logger.log(
      `Initiating Bulk Download for ${saleOrderNumbers.length} SOs`,
    );

    // 1. Deduplicate the input array
    const uniqueSoNumbers = [...new Set(saleOrderNumbers)];

    // 2. Fetch all matching orders from DB to handle multiple OBDs for the same SO number
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: { saleOrderNumber: { in: uniqueSoNumbers } },
      select: {
        saleOrderNumber: true,
        outboundDelivery: true,
        isErpImported: true,
      },
    });

    const baseDir =
      process.env.SFTP_BASE_DIR_DRIVE || 'uploads/fanuc/samba_mount_drive';
    const activeDir = path.posix.join(baseDir, 'active');
    const errorDir = path.posix.join(baseDir, 'error');

    const missingSOs: string[] = [];
    const filesToZip: { name: string; buffer: Buffer }[] = [];

    // 3. Iterate over the DB results (so we catch ANI001 and ANI002 separately)
    for (const so of salesOrders) {
      // If it's already imported (like ANI001), skip it.
      // We only want to download the missing ones.
      if (so.isErpImported === 1) {
        continue;
      }

      const soNumber = so.saleOrderNumber;
      const obd = so.outboundDelivery;

      if (!obd) {
        missingSOs.push(soNumber);
        continue;
      }

      const filename = `${soNumber}_${obd}.xlsx`;
      const activePath = path.posix.join(activeDir, filename);
      const errorPath = path.posix.join(errorDir, filename);

      try {
        // Check active folder first
        const existsInActive = await this.sftpService.exists(activePath);
        if (existsInActive) {
          const buffer = await this.sftpService.getBuffer(activePath);
          filesToZip.push({ name: filename, buffer });
        } else {
          // If not in active, check error folder
          const existsInError = await this.sftpService.exists(errorPath);
          if (existsInError) {
            const buffer = await this.sftpService.getBuffer(errorPath);
            filesToZip.push({ name: filename, buffer });
          } else {
            // Not found in either folder (Pushing SO_OBD format for better frontend clarity)
            missingSOs.push(`${soNumber}_${obd}`);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to read file for SO ${soNumber}_${obd}`, err);
        missingSOs.push(`${soNumber}_${obd}`);
      }
    }

    if (filesToZip.length === 0) {
      return res.status(404).json({
        message: `Data not available for the following SO(s): ${missingSOs.join(', ')}`,
        missing: missingSOs,
      });
    }

    // Set headers for ZIP download and expose custom header for missing SOs
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="ERP_Data.zip"');
    res.setHeader('X-Missing-SOs', missingSOs.join(','));
    res.setHeader('Access-Control-Expose-Headers', 'X-Missing-SOs');

    let archiver;
    try {
      archiver = require('archiver');
    } catch (err) {
      this.logger.error('Archiver package not found.');
      throw new InternalServerErrorException('Zip package missing on server.');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err: any) => {
      throw err;
    });
    archive.pipe(res);

    for (const file of filesToZip) {
      archive.append(file.buffer, { name: file.name });
    }

    await archive.finalize();
  }

  async getActiveFilesForSo(
    saleOrderNumber: string,
  ): Promise<{ obd: string; filename: string }[]> {
    const baseDir =
      process.env.SFTP_BASE_DIR_DRIVE || 'uploads/fanuc/samba_mount_drive';
    const activeDir = path.posix.join(baseDir, 'active');

    const files = (await this.sftpService.list(activeDir)) as Array<{
      type: string;
      name: string;
    }>;
    const prefix = `${saleOrderNumber}_`;

    return files
      .filter(
        (f) =>
          f.type !== 'd' &&
          f.name.startsWith(prefix) &&
          f.name.endsWith('.xlsx'),
      )
      .map((f) => ({
        obd: f.name.slice(prefix.length, -'.xlsx'.length),
        filename: f.name,
      }));
  }
}
