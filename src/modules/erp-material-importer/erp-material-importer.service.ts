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

  async importFromDrive(saleOrderNumber: string, username: string) {
    this.logger.log(`Initiating Drive Import for SO: ${saleOrderNumber}`);

    const so = await this.prisma.salesOrder.findUnique({
      where: { saleOrderNumber },
      select: { outboundDelivery: true },
    });

    if (!so || !so.outboundDelivery) {
      throw new BadRequestException(
        `Sales Order or Outbound Delivery (OBD) not found for SO: ${saleOrderNumber}`,
      );
    }

    const baseDir = process.env.SFTP_BASE_DIR_DRIVE || 'uploads/fanuc/samba_mount_drive';
    
    // Ensure we use POSIX paths for SFTP
    const activeDir = path.posix.join(baseDir, 'active');
    const archivedDir = path.posix.join(baseDir, 'archive');
    const errorDir = path.posix.join(baseDir, 'error');

    const filename = `${saleOrderNumber}_${so.outboundDelivery}.xlsx`;
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
      throw new InternalServerErrorException('Failed to read the file from drive.');
    }

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: fileBuffer,
      size: fileBuffer.length,
      destination: activeDir,
      filename: filename,
      path: filePath,
      stream: null as any,
    };

    try {
      const result = await this.processFile(mockFile, saleOrderNumber, username);

      const archivePath = path.posix.join(archivedDir, filename);
      await this.sftpService.rename(filePath, archivePath);
      this.logger.log(`Moved file to SFTP Archive: ${archivePath}`);

      return result;
    } catch (error) {
      this.logger.error(
        `Import failed for ${filename}. Moving to SFTP Error folder.`,
        error,
      );
      try {
        const errorPath = path.posix.join(errorDir, filename);
        await this.sftpService.rename(filePath, errorPath);
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
    username: string = 'ERP Import'
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

  async bulkImportFromDrive(saleOrderNumbers: string[], username: string) {
    this.logger.log(`Initiating Bulk Drive Import for ${saleOrderNumbers.length} SOs`);

    const results: { soNumber: string; status: string; reason: string }[] = [];
    const baseDir = process.env.SFTP_BASE_DIR_DRIVE || '';
    const activeDir = path.posix.join(baseDir, 'active');
    const archivedDir = path.posix.join(baseDir, 'archive');
    const errorDir = path.posix.join(baseDir, 'error');

    const salesOrders = await this.prisma.salesOrder.findMany({
      where: { saleOrderNumber: { in: saleOrderNumbers } },
      select: { 
        saleOrderNumber: true, 
        outboundDelivery: true,
        isErpImported: true,
        _count: { select: { materialData: true } } 
      },
    });

    const soMap = new Map(salesOrders.map(so => [so.saleOrderNumber, so]));

    for (const soNumber of saleOrderNumbers) {
      const so = soMap.get(soNumber);
      
      if (!so) {
        results.push({ soNumber, status: 'Failed', reason: 'Sales Order not found in system' });
        continue;
      }

      if (so.isErpImported === 1) {
        results.push({ soNumber, status: 'Skipped', reason: 'Data already imported' });
        continue;
      }

      if (so._count.materialData > 0) {
        results.push({ soNumber, status: 'Skipped', reason: 'Data already imported' });
        continue;
      }

      if (!so.outboundDelivery) {
        results.push({ soNumber, status: 'Skipped', reason: 'Outbound Delivery (OBD) missing' });
        continue;
      }

      const filename = `${soNumber}_${so.outboundDelivery}.xlsx`;
      const filePath = path.posix.join(activeDir, filename);

      try {
        const exists = await this.sftpService.exists(filePath);
        if (!exists) {
          results.push({ soNumber, status: 'Skipped', reason: `File not found: ${filename}` });
          continue;
        }
        const fileBuffer = await this.sftpService.getBuffer(filePath);

        const mockFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: fileBuffer,
          size: fileBuffer.length,
          destination: activeDir,
          filename: filename,
          path: filePath,
          stream: null as any,
        };

        await this.processFile(mockFile, soNumber, username);

        const archivePath = path.posix.join(archivedDir, filename);
        await this.sftpService.rename(filePath, archivePath);
        
        results.push({ soNumber, status: 'Success', reason: 'Imported successfully' });

      } catch (error) {
        this.logger.error(`Bulk import error for ${soNumber}`, error);
        
        try {
          const exists = await this.sftpService.exists(filePath);
          if (exists) {
            const errorPath = path.posix.join(errorDir, filename);
            await this.sftpService.rename(filePath, errorPath);
          }
        } catch (moveErr) {
          this.logger.error(`Failed to move file ${filename} to Error folder`, moveErr);
        }

        results.push({ soNumber, status: 'Failed', reason: error.message || 'Processing failed' });
      }
    }

    return {
      message: 'Bulk import process completed',
      summary: results
    };
  }

  private async readFile(file: Express.Multer.File): Promise<any[]> {
    try {
      const workbook = new Workbook();
      await workbook.xlsx.load(file.buffer as any);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) return [];

      const jsonData: any[] = [];
      const headers: string[] = [];

      const headerLookup = new Map<string, string>();
      Object.keys(columnMapping).forEach((key) => {
        headerLookup.set(key.toLowerCase(), key);
      });

      const skipRows = parseInt(process.env.ERP_IMPORT_SKIP_ROWS || '1', 10);

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell, colNumber) => {
            const cellText = cell.text ? cell.text.trim() : '';
            const lowerText = cellText.toLowerCase();

            const canonicalHeader = headerLookup.get(lowerText) || cellText;

            headers[colNumber] = canonicalHeader;
          });
        } else if (rowNumber <= skipRows) {
          return;
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
            jsonData.push(rowData);
          }
        }
      });

      return jsonData;
    } catch (error) {
      this.logger.error('Failed to read or parse the Excel file.', error);
      throw new BadRequestException(
        'Invalid or corrupted file. Please upload a valid .xlsx file.',
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

    const orderExists = await this.prisma.salesOrder.findUnique({
      where: { saleOrderNumber: soNumber },
    });

    if (!orderExists) {
      return `Sales Order Number '${soNumber}' does not exist in the system.`;
    }

    return null;
  }

  private renameColumns(records: any[]): any[] {
    return records.map((record) => {
      const newRecord: { [key: string]: any } = {};
      for (const key of Object.keys(columnMapping)) {
        newRecord[columnMapping[key]] = record[key];
      }
      return newRecord;
    });
  }

  private async upsertRecords(records: any[], username: string) {
    if (records.length === 0) return;

    const soNumber = String(records[0].saleOrderNumber);
    this.logger.log(
      `Upserting ${records.length} records for SO Number: ${soNumber}`,
    );

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
      return [a, b].filter(Boolean).join(' ').trim();
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

      return parts.join(' ').trim();
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
      };
    });

    try {
      await this.prisma.$transaction(async (tx) => {
                
        const so = await tx.salesOrder.findUnique({
            where: { saleOrderNumber: soNumber },
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
        };

        if (computedCustomerName) {
            let existingCustomer = await tx.customer.findFirst({
                where: { name: { equals: computedCustomerName, mode: 'insensitive' } },
            });

            if (!existingCustomer) {
                existingCustomer = await tx.customer.create({
                    data: { 
                        name: computedCustomerName,
                        address: computedCustomerAddress || null
                    },
                });
            }

            updateData.customer = { connect: { id: existingCustomer.id } };
            updateData.customerNameText = null;
        }

        if (computedCustomerAddress) {
            updateData.address = computedCustomerAddress;
        }

        await tx.salesOrder.update({
            where: { saleOrderNumber: soNumber },
            data: updateData,
        });

        this.logger.log(`Deleting existing records for SO: ${soNumber}`);
        await tx.eRP_Material_Data.deleteMany({
          where: { saleOrderNumber: soNumber },
        });

        this.logger.log(`Inserting new records for SO: ${soNumber}`);
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
}