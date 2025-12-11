"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ErpMaterialImporterService", {
    enumerable: true,
    get: function() {
        return ErpMaterialImporterService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _exceljs = require("exceljs");
const _client = require("@prisma/client");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const columnMapping = {
    "SO Number": "saleOrderNumber",
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
    "Required Quantity": "Required_Qty",
    "Issue Stage": "Issue_stage",
    "Packing Stage": "Packing_stage",
    "Status": "Status"
};
let ErpMaterialImporterService = class ErpMaterialImporterService {
    async processFile(file, expectedSaleOrderNumber) {
        this.logger.log(`Starting to process file: ${file.originalname}`);
        const records = await this.readFile(file);
        const validationError = await this.validateRecords(records, expectedSaleOrderNumber);
        if (validationError) {
            this.logger.error(`Validation failed for ${file.originalname}: ${validationError}`);
            throw new _common.BadRequestException(validationError);
        }
        const renamedRecords = this.renameColumns(records);
        await this.upsertRecords(renamedRecords);
        const soNumber = String(records[0]["SO Number"]);
        try {
            await this.prisma.eRPMaterialLog.create({
                data: {
                    dateTime: new Date(),
                    fileName: file.originalname,
                    exceptionStatus: 'Success',
                    soNo: soNumber,
                    noOfFilesExecuted: 1
                }
            });
            this.logger.log(`Successfully logged import for SO: ${soNumber}`);
        } catch (logError) {
            this.logger.error(`Failed to write to ERPMaterialLog for SO: ${soNumber}`, logError);
        }
        this.logger.log(`Successfully processed file: ${file.originalname}`);
        return {
            message: `File processed successfully. ${renamedRecords.length} records upserted.`
        };
    }
    async readFile(file) {
        try {
            const workbook = new _exceljs.Workbook();
            await workbook.xlsx.load(file.buffer);
            const worksheet = workbook.worksheets[0];
            if (!worksheet) return [];
            const jsonData = [];
            const headers = [];
            const headerLookup = new Map();
            Object.keys(columnMapping).forEach((key)=>{
                headerLookup.set(key.toLowerCase(), key);
            });
            worksheet.eachRow((row, rowNumber)=>{
                if (rowNumber === 1) {
                    row.eachCell((cell, colNumber)=>{
                        const cellText = cell.text ? cell.text.trim() : '';
                        const lowerText = cellText.toLowerCase();
                        const canonicalHeader = headerLookup.get(lowerText) || cellText;
                        headers[colNumber] = canonicalHeader;
                    });
                } else {
                    const rowData = {};
                    let hasData = false;
                    headers.forEach((header, colNumber)=>{
                        if (!header) return;
                        const cell = row.getCell(colNumber);
                        let val = cell.value;
                        if (val && typeof val === 'object') {
                            if ('text' in val) val = val.text;
                            else if ('result' in val) val = val.result;
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
            throw new _common.BadRequestException('Invalid or corrupted file. Please upload a valid .xlsx file.');
        }
    }
    async validateRecords(records, expectedSaleOrderNumber) {
        if (records.length === 0) {
            return 'File is empty.';
        }
        const expectedHeaders = Object.keys(columnMapping);
        const actualHeaders = Object.keys(records[0]);
        const missingHeaders = expectedHeaders.filter((h)=>!actualHeaders.includes(h));
        if (missingHeaders.length > 0) {
            return `Header mismatch. Missing columns: ${missingHeaders.join(', ')}`;
        }
        const matCodeHeader = "Material Code";
        for (const record of records){
            if (!record[matCodeHeader]) {
                return 'Missing Material Code in one or more rows.';
            }
        }
        const soNumberHeader = "SO Number";
        const soNumbers = new Set(records.map((r)=>r[soNumberHeader]).filter(Boolean));
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
            where: {
                saleOrderNumber: soNumber
            }
        });
        if (!orderExists) {
            return `Sales Order Number '${soNumber}' does not exist in the system.`;
        }
        return null;
    }
    renameColumns(records) {
        return records.map((record)=>{
            const newRecord = {};
            for (const key of Object.keys(columnMapping)){
                newRecord[columnMapping[key]] = record[key];
            }
            return newRecord;
        });
    }
    async upsertRecords(records) {
        if (records.length === 0) return;
        const soNumber = String(records[0].saleOrderNumber);
        this.logger.log(`Upserting ${records.length} records for SO Number: ${soNumber}`);
        const safeParseInt = (val, defaultVal = null)=>{
            if (val === null || val === undefined || String(val).trim() === '') return defaultVal;
            const num = parseInt(String(val), 10);
            return isNaN(num) ? defaultVal : num;
        };
        const safeToString = (val, defaultVal = null)=>{
            if (val === null || val === undefined) return defaultVal;
            return String(val).trim(); // Ensure trim here as well
        };
        const recordsToCreate = records.map((r)=>({
                saleOrderNumber: safeToString(r.saleOrderNumber),
                customerId: safeParseInt(r.customerId),
                transferOrder: safeToString(r.transferOrder),
                FG_OBD: safeToString(r.FG_OBD),
                Machine_Model: safeToString(r.Machine_Model),
                CNC_Serial_No: safeToString(r.CNC_Serial_No),
                Material_Code: safeToString(r.Material_Code, ''),
                Material_Description: safeToString(r.Material_Description, ''),
                Batch_No: safeToString(r.Batch_No, ''),
                SO_Donor_Batch: safeToString(r.SO_Donor_Batch, ''),
                Cert_No: safeToString(r.Cert_No, ''),
                Bin_No: safeToString(r.Bin_No, ''),
                A_D_F: safeToString(r.A_D_F, ''),
                Required_Qty: safeParseInt(r.Required_Qty, 0),
                Issue_stage: safeParseInt(r.Issue_stage, 0),
                Packing_stage: safeParseInt(r.Packing_stage, 0),
                Status: safeToString(r.Status)
            }));
        try {
            await this.prisma.$transaction(async (tx)=>{
                this.logger.log(`Deleting existing records for SO: ${soNumber}`);
                await tx.eRP_Material_Data.deleteMany({
                    where: {
                        saleOrderNumber: soNumber
                    }
                });
                this.logger.log(`Inserting new records for SO: ${soNumber}`);
                await tx.eRP_Material_Data.createMany({
                    data: recordsToCreate
                });
            });
        } catch (e) {
            this.logger.error(`Database transaction failed for SO: ${soNumber}`, e);
            if (e instanceof _client.Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2003') {
                    this.logger.warn('Prisma FK constraint error encountered during ERP material import; proceeding to surface generic error without customer-id hint.');
                }
            }
            throw new _common.InternalServerErrorException('Database transaction failed.');
        }
    }
    constructor(prisma){
        this.prisma = prisma;
        this.logger = new _common.Logger(ErpMaterialImporterService.name);
    }
};
ErpMaterialImporterService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], ErpMaterialImporterService);

//# sourceMappingURL=erp-material-importer.service.js.map