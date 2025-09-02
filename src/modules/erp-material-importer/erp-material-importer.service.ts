import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as xlsx from 'xlsx';
import { Prisma } from '@prisma/client';

const columnMapping = {
  "SO Number": "saleOrderNumber",
  "Customer ID": "customerId",
  "Transfer Order": "transferOrder",
  "FG OBD": "FG_OBD",
  "Machine Model": "Machine_Model",
  "CNC Serial No": "CNC_Serial_No",
  "Material Code": "Material_Code",
  "Material Description": "Material_Description",
  "Batch No": "Batch_No",
  "SO Donor Batch": "SO_Donor_Batch",
  "Certificate No": "Cert_No",
  "Bin No": "Bin_No",
  "A D F": "A_D_F",
  "Required Qty": "Required_Qty",
  "Issue Stage": "Issue_stage",
  "Packing Stage": "Packing_stage",
  "Status": "Status",
};

@Injectable()
export class ErpMaterialImporterService {
  private readonly logger = new Logger(ErpMaterialImporterService.name);

  constructor(private prisma: PrismaService) {}

  async processFile(file: Express.Multer.File) {
    this.logger.log(`Starting to process file: ${file.originalname}`);
    const records = this.readFile(file);
    const validationError = await this.validateRecords(records);
    if (validationError) {
      this.logger.error(`Validation failed for ${file.originalname}: ${validationError}`);
      throw new BadRequestException(validationError);
    }

    const renamedRecords = this.renameColumns(records);
    await this.upsertRecords(renamedRecords);

    this.logger.log(`Successfully processed file: ${file.originalname}`);
    return { message: `File processed successfully. ${renamedRecords.length} records upserted.` };
  }

  private readFile(file: Express.Multer.File): any[] {
    try {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return xlsx.utils.sheet_to_json(worksheet, { defval: null });
    } catch (error) {
      this.logger.error('Failed to read or parse the Excel file.', error);
      throw new BadRequestException('Invalid or corrupted file. Please upload a valid .xlsx or .csv file.');
    }
  }

  private async validateRecords(records: any[]): Promise<string | null> {
    if (records.length === 0) {
      return 'File is empty.';
    }

    const expectedHeaders = Object.keys(columnMapping);
    const actualHeaders = Object.keys(records[0]);

    const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
    if (missingHeaders.length > 0) {
        return `Header mismatch. Missing columns: ${missingHeaders.join(', ')}`;
    }

    const materialCodes = new Set<string>();
    for (const record of records) {
        const materialCode = record['Material Code'];
        if (materialCode) {
            if (materialCodes.has(materialCode)) {
                return `Duplicate Material Code found in the file: ${materialCode}. Please ensure all material codes are unique.`;
            }
            materialCodes.add(materialCode);
        } else {
            return 'Missing Material Code in one or more rows.';
        }
    }

    const soNumbers = new Set(records.map(r => r['SO Number']).filter(Boolean));
    if (soNumbers.size > 1) {
      return 'Inconsistent SO Numbers found in the file. All records must belong to the same SO Number.';
    }
    
    const soNumberValue = soNumbers.values().next().value;
    if (!soNumberValue) {
      return 'Missing SO Number in one or more rows.';
    }
    const soNumber = String(soNumberValue);

    const orderExists = await this.prisma.salesOrder.findUnique({
      where: { saleOrderNumber: soNumber },
    });

    if (!orderExists) {
      return `Sales Order Number '${soNumber}' does not exist in the system.`;
    }

    return null;
  }
  
  private renameColumns(records: any[]): any[] {
    return records.map(record => {
      const newRecord: { [key: string]: any } = {};
      for (const key of Object.keys(columnMapping)) {
          newRecord[columnMapping[key]] = record[key];
      }
      return newRecord;
    });
  }

  private async upsertRecords(records: any[]) {
    if (records.length === 0) return;
    
    const soNumber = String(records[0].saleOrderNumber); // Also ensure string here
    this.logger.log(`Upserting ${records.length} records for SO Number: ${soNumber}`);

    const safeParseInt = (val: any, defaultVal: number | null = null): number | null => {
        if (val === null || val === undefined || String(val).trim() === '') return defaultVal;
        const num = parseInt(String(val), 10);
        return isNaN(num) ? defaultVal : num;
    };
    
    const safeToString = (val: any, defaultVal: string | null = null): string | null => {
        if (val === null || val === undefined) return defaultVal;
        return String(val);
    };

    const recordsToCreate = records.map(r => ({
      saleOrderNumber: safeToString(r.saleOrderNumber)!,
      customerId: safeParseInt(r.customerId),
      transferOrder: safeToString(r.transferOrder),
      FG_OBD: safeToString(r.FG_OBD),
      Machine_Model: safeToString(r.Machine_Model),
      CNC_Serial_No: safeToString(r.CNC_Serial_No),
      Material_Code: safeToString(r.Material_Code, '')!,
      Material_Description: safeToString(r.Material_Description, '')!,
      Batch_No: safeToString(r.Batch_No, '')!,
      SO_Donor_Batch: safeToString(r.SO_Donor_Batch, '')!,
      Cert_No: safeToString(r.Cert_No, '')!,
      Bin_No: safeToString(r.Bin_No, '')!,
      A_D_F: safeToString(r.A_D_F, '')!,
      Required_Qty: safeParseInt(r.Required_Qty, 0)!,
      Issue_stage: safeParseInt(r.Issue_stage, 0)!,
      Packing_stage: safeParseInt(r.Packing_stage, 0)!,
      Status: safeToString(r.Status),
    }));

    try {
      await this.prisma.$transaction(async (tx) => {
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
            throw new BadRequestException('Invalid data in file. A record refers to a Customer ID that does not exist.');
         }
      }
      throw new InternalServerErrorException('Database transaction failed.');
    }
  }
}