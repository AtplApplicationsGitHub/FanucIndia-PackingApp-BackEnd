"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LookupService", {
    enumerable: true,
    get: function() {
        return LookupService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _exceljs = require("exceljs");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let LookupService = class LookupService {
    getProducts() {
        return this.prisma.product.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
    createProduct(dto) {
        return this.prisma.product.create({
            data: dto
        });
    }
    updateProduct(id, dto) {
        return this.prisma.product.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteProduct(id) {
        try {
            return await this.prisma.product.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete product: One or more orders depend on this product.');
            }
            throw error;
        }
    }
    getTransporters() {
        return this.prisma.transporter.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
    createTransporter(dto) {
        return this.prisma.transporter.create({
            data: dto
        });
    }
    updateTransporter(id, dto) {
        return this.prisma.transporter.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteTransporter(id) {
        try {
            return await this.prisma.transporter.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete transporter: One or more orders depend on this transporter.');
            }
            throw error;
        }
    }
    getPlantCodes() {
        return this.prisma.plantCode.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
    createPlantCode(dto) {
        return this.prisma.plantCode.create({
            data: dto
        });
    }
    updatePlantCode(id, dto) {
        return this.prisma.plantCode.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deletePlantCode(id) {
        try {
            return await this.prisma.plantCode.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete plant code: One or more orders depend on this plant code.');
            }
            throw error;
        }
    }
    getSalesZones() {
        return this.prisma.salesZone.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
    createSalesZone(dto) {
        return this.prisma.salesZone.create({
            data: dto
        });
    }
    updateSalesZone(id, dto) {
        return this.prisma.salesZone.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteSalesZone(id) {
        try {
            return await this.prisma.salesZone.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete sales zone: One or more orders depend on this sales zone.');
            }
            throw error;
        }
    }
    getPackConfigs() {
        return this.prisma.packConfig.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
    createPackConfig(dto) {
        return this.prisma.packConfig.create({
            data: dto
        });
    }
    updatePackConfig(id, dto) {
        return this.prisma.packConfig.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deletePackConfig(id) {
        try {
            return await this.prisma.packConfig.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete packing configuration: One or more orders depend on this value.');
            }
            throw error;
        }
    }
    getCustomers() {
        return this.prisma.customer.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
    createCustomer(dto) {
        return this.prisma.customer.create({
            data: dto
        });
    }
    updateCustomer(id, dto) {
        return this.prisma.customer.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteCustomer(id) {
        try {
            return await this.prisma.customer.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete customer: One or more orders depend on this customer.');
            }
            throw error;
        }
    }
    getPrinters() {
        return this.prisma.printer.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
    createPrinter(dto) {
        return this.prisma.printer.create({
            data: dto
        });
    }
    updatePrinter(id, dto) {
        return this.prisma.printer.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deletePrinter(id) {
        try {
            return await this.prisma.printer.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete printer: One or more entities depend on this printer.');
            }
            throw error;
        }
    }
    getMaterialBarcodes() {
        return this.prisma.materialBarcode.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
    createMaterialBarcode(dto) {
        return this.prisma.materialBarcode.create({
            data: dto
        });
    }
    updateMaterialBarcode(id, dto) {
        return this.prisma.materialBarcode.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteMaterialBarcode(id) {
        return await this.prisma.materialBarcode.delete({
            where: {
                id
            }
        });
    }
    async generateBulkTemplate(res) {
        const workbook = new _exceljs.Workbook();
        // Define the schema for all 8 master tables
        const sheets = [
            {
                name: 'Products',
                data: await this.getProducts(),
                columns: [
                    {
                        header: 'ID (Do not edit)',
                        key: 'id',
                        width: 10
                    },
                    {
                        header: 'Name',
                        key: 'name',
                        width: 30
                    },
                    {
                        header: 'Code',
                        key: 'code',
                        width: 20
                    }
                ]
            },
            {
                name: 'Transporters',
                data: await this.getTransporters(),
                columns: [
                    {
                        header: 'ID (Do not edit)',
                        key: 'id',
                        width: 10
                    },
                    {
                        header: 'Name',
                        key: 'name',
                        width: 30
                    }
                ]
            },
            {
                name: 'Plant Codes',
                data: await this.getPlantCodes(),
                columns: [
                    {
                        header: 'ID (Do not edit)',
                        key: 'id',
                        width: 10
                    },
                    {
                        header: 'Code',
                        key: 'code',
                        width: 15
                    },
                    {
                        header: 'Description',
                        key: 'description',
                        width: 30
                    }
                ]
            },
            {
                name: 'Sales Zones',
                data: await this.getSalesZones(),
                columns: [
                    {
                        header: 'ID (Do not edit)',
                        key: 'id',
                        width: 10
                    },
                    {
                        header: 'Name',
                        key: 'name',
                        width: 30
                    }
                ]
            },
            {
                name: 'Packing Configs',
                data: await this.getPackConfigs(),
                columns: [
                    {
                        header: 'ID (Do not edit)',
                        key: 'id',
                        width: 10
                    },
                    {
                        header: 'Config Name',
                        key: 'configName',
                        width: 30
                    }
                ]
            },
            {
                name: 'Customers',
                data: await this.getCustomers(),
                columns: [
                    {
                        header: 'ID (Do not edit)',
                        key: 'id',
                        width: 10
                    },
                    {
                        header: 'Name',
                        key: 'name',
                        width: 30
                    },
                    {
                        header: 'Address',
                        key: 'address',
                        width: 40
                    }
                ]
            },
            {
                name: 'Printers',
                data: await this.getPrinters(),
                columns: [
                    {
                        header: 'ID (Do not edit)',
                        key: 'id',
                        width: 10
                    },
                    {
                        header: 'Name',
                        key: 'name',
                        width: 30
                    }
                ]
            },
            {
                name: 'Material Barcodes',
                data: await this.getMaterialBarcodes(),
                columns: [
                    {
                        header: 'ID (Do not edit)',
                        key: 'id',
                        width: 10
                    },
                    {
                        header: 'ERP Code',
                        key: 'erpCode',
                        width: 20
                    },
                    {
                        header: 'Mapping Barcode',
                        key: 'mappingBarcode',
                        width: 20
                    },
                    {
                        header: 'Group',
                        key: 'group',
                        width: 15
                    },
                    {
                        header: 'Accept Bulk Data (True/False)',
                        key: 'acceptBulkData',
                        width: 25
                    },
                    {
                        header: 'Remarks Required (True/False)',
                        key: 'remarksRequired',
                        width: 25
                    },
                    {
                        header: 'Classification',
                        key: 'classification',
                        width: 20
                    }
                ]
            }
        ];
        for (const sheetDef of sheets){
            const sheet = workbook.addWorksheet(sheetDef.name);
            sheet.columns = sheetDef.columns;
            // Add existing data
            sheet.addRows(sheetDef.data);
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="master_data_bulk.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    }
    async processBulkImport(file) {
        const workbook = new _exceljs.Workbook();
        await workbook.xlsx.load(file.buffer);
        const results = [];
        // Helper to safely get cell string value
        const getVal = (row, colIdx)=>{
            const val = row.getCell(colIdx).value;
            // Handle rich text or other object types if strictly string needed, 
            // but usually toString() works for simple imports
            return val ? String(val).trim() : null;
        };
        // Helper for boolean
        const getBool = (row, colIdx)=>{
            const val = row.getCell(colIdx).value;
            if (typeof val === 'boolean') return val;
            const s = String(val).toLowerCase().trim();
            return s === 'true' || s === 'yes' || s === '1';
        };
        // Use a transaction to ensure data consistency
        await this.prisma.$transaction(async (tx)=>{
            const promises = []; // We will store all operations here
            // 1. Products
            const productSheet = workbook.getWorksheet('Products');
            if (productSheet) {
                productSheet.eachRow((row, rowNumber)=>{
                    if (rowNumber === 1) return; // Skip header
                    const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
                    const name = getVal(row, 2);
                    const code = getVal(row, 3);
                    if (name) {
                        if (id) {
                            promises.push(tx.product.update({
                                where: {
                                    id
                                },
                                data: {
                                    name,
                                    code
                                }
                            }).catch(()=>{}));
                        } else {
                            promises.push(tx.product.create({
                                data: {
                                    name,
                                    code
                                }
                            }).catch(()=>{}));
                        }
                    }
                });
                results.push('Products processed');
            }
            // 2. Transporters
            const transpSheet = workbook.getWorksheet('Transporters');
            if (transpSheet) {
                transpSheet.eachRow((row, rowNumber)=>{
                    if (rowNumber === 1) return;
                    const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
                    const name = getVal(row, 2);
                    if (name) {
                        if (id) promises.push(tx.transporter.update({
                            where: {
                                id
                            },
                            data: {
                                name
                            }
                        }).catch(()=>{}));
                        else promises.push(tx.transporter.create({
                            data: {
                                name
                            }
                        }).catch(()=>{}));
                    }
                });
                results.push('Transporters processed');
            }
            // 3. Plant Codes
            const plantSheet = workbook.getWorksheet('Plant Codes');
            if (plantSheet) {
                plantSheet.eachRow((row, rowNumber)=>{
                    if (rowNumber === 1) return;
                    const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
                    const code = getVal(row, 2);
                    const description = getVal(row, 3) || '';
                    if (code) {
                        if (id) promises.push(tx.plantCode.update({
                            where: {
                                id
                            },
                            data: {
                                code,
                                description
                            }
                        }).catch(()=>{}));
                        else promises.push(tx.plantCode.create({
                            data: {
                                code,
                                description
                            }
                        }).catch(()=>{}));
                    }
                });
                results.push('Plant Codes processed');
            }
            // 4. Sales Zones
            const zoneSheet = workbook.getWorksheet('Sales Zones');
            if (zoneSheet) {
                zoneSheet.eachRow((row, rowNumber)=>{
                    if (rowNumber === 1) return;
                    const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
                    const name = getVal(row, 2);
                    if (name) {
                        if (id) promises.push(tx.salesZone.update({
                            where: {
                                id
                            },
                            data: {
                                name
                            }
                        }).catch(()=>{}));
                        else promises.push(tx.salesZone.create({
                            data: {
                                name
                            }
                        }).catch(()=>{}));
                    }
                });
                results.push('Sales Zones processed');
            }
            // 5. Packing Configs
            const packSheet = workbook.getWorksheet('Packing Configs');
            if (packSheet) {
                packSheet.eachRow((row, rowNumber)=>{
                    if (rowNumber === 1) return;
                    const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
                    const configName = getVal(row, 2);
                    if (configName) {
                        if (id) promises.push(tx.packConfig.update({
                            where: {
                                id
                            },
                            data: {
                                configName
                            }
                        }).catch(()=>{}));
                        else promises.push(tx.packConfig.create({
                            data: {
                                configName
                            }
                        }).catch(()=>{}));
                    }
                });
                results.push('Packing Configs processed');
            }
            // 6. Customers
            const custSheet = workbook.getWorksheet('Customers');
            if (custSheet) {
                custSheet.eachRow((row, rowNumber)=>{
                    if (rowNumber === 1) return;
                    const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
                    const name = getVal(row, 2);
                    const address = getVal(row, 3) || '';
                    if (name) {
                        if (id) promises.push(tx.customer.update({
                            where: {
                                id
                            },
                            data: {
                                name,
                                address
                            }
                        }).catch(()=>{}));
                        else promises.push(tx.customer.create({
                            data: {
                                name,
                                address
                            }
                        }).catch(()=>{}));
                    }
                });
                results.push('Customers processed');
            }
            // 7. Printers
            const printSheet = workbook.getWorksheet('Printers');
            if (printSheet) {
                printSheet.eachRow((row, rowNumber)=>{
                    if (rowNumber === 1) return;
                    const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
                    const name = getVal(row, 2);
                    if (name) {
                        if (id) promises.push(tx.printer.update({
                            where: {
                                id
                            },
                            data: {
                                name
                            }
                        }).catch(()=>{}));
                        else promises.push(tx.printer.create({
                            data: {
                                name
                            }
                        }).catch(()=>{}));
                    }
                });
                results.push('Printers processed');
            }
            // 8. Material Barcodes
            const matSheet = workbook.getWorksheet('Material Barcodes');
            if (matSheet) {
                matSheet.eachRow((row, rowNumber)=>{
                    if (rowNumber === 1) return;
                    const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
                    const erpCode = getVal(row, 2);
                    const mappingBarcode = getVal(row, 3);
                    const group = getVal(row, 4);
                    const acceptBulkData = getBool(row, 5);
                    const remarksRequired = getBool(row, 6);
                    const classification = getVal(row, 7);
                    if (erpCode) {
                        const data = {
                            erpCode,
                            mappingBarcode,
                            group,
                            acceptBulkData,
                            remarksRequired,
                            classification
                        };
                        if (id) promises.push(tx.materialBarcode.update({
                            where: {
                                id
                            },
                            data
                        }).catch(()=>{}));
                        else promises.push(tx.materialBarcode.create({
                            data
                        }).catch(()=>{}));
                    }
                });
                results.push('Material Barcodes processed');
            }
            await Promise.all(promises);
        });
        return {
            message: 'Bulk import completed successfully',
            details: results
        };
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
LookupService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], LookupService);

//# sourceMappingURL=lookup.service.js.map