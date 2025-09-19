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
const _xlsx = /*#__PURE__*/ _interop_require_wildcard(require("xlsx"));
const _client = require("@prisma/client");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
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
    "Status": "Status"
};
let ErpMaterialImporterService = class ErpMaterialImporterService {
    async processFile(file, expectedSaleOrderNumber) {
        this.logger.log(`Starting to process file: ${file.originalname}`);
        const records = this.readFile(file);
        const validationError = await this.validateRecords(records, expectedSaleOrderNumber);
        if (validationError) {
            this.logger.error(`Validation failed for ${file.originalname}: ${validationError}`);
            throw new _common.BadRequestException(validationError);
        }
        const renamedRecords = this.renameColumns(records);
        await this.upsertRecords(renamedRecords);
        this.logger.log(`Successfully processed file: ${file.originalname}`);
        return {
            message: `File processed successfully. ${renamedRecords.length} records upserted.`
        };
    }
    readFile(file) {
        try {
            const workbook = _xlsx.read(file.buffer, {
                type: 'buffer'
            });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            return _xlsx.utils.sheet_to_json(worksheet, {
                defval: null
            });
        } catch (error) {
            this.logger.error('Failed to read or parse the Excel file.', error);
            throw new _common.BadRequestException('Invalid or corrupted file. Please upload a valid .xlsx or .csv file.');
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
        const materialCodes = new Set();
        for (const record of records){
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
        const soNumbers = new Set(records.map((r)=>r['SO Number']).filter(Boolean));
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
        const soNumber = String(records[0].saleOrderNumber); // Also ensure string here
        this.logger.log(`Upserting ${records.length} records for SO Number: ${soNumber}`);
        const safeParseInt = (val, defaultVal = null)=>{
            if (val === null || val === undefined || String(val).trim() === '') return defaultVal;
            const num = parseInt(String(val), 10);
            return isNaN(num) ? defaultVal : num;
        };
        const safeToString = (val, defaultVal = null)=>{
            if (val === null || val === undefined) return defaultVal;
            return String(val);
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
                    throw new _common.BadRequestException('Invalid data in file. A record refers to a Customer ID that does not exist.');
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