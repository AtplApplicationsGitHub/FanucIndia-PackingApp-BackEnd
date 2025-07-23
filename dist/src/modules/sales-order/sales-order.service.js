"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesOrderService = void 0;
const common_1 = require("@nestjs/common");
const exceljs_1 = require("exceljs");
const prisma_service_1 = require("../../prisma.service");
let SalesOrderService = class SalesOrderService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateBulkTemplate(res) {
        const workbook = new exceljs_1.Workbook();
        const worksheet = workbook.addWorksheet('Bulk Import');
        worksheet.columns = [
            { header: 'Product', key: 'product' },
            { header: 'Sale Order Number', key: 'saleOrderNumber' },
            { header: 'Outbound Delivery', key: 'outboundDelivery' },
            { header: 'Transfer Order', key: 'transferOrder' },
            { header: 'Delivery Date', key: 'deliveryDate' },
            { header: 'Transporter', key: 'transporter' },
            { header: 'Plant Code', key: 'plantCode' },
            { header: 'Payment Clearance', key: 'paymentClearance' },
            { header: 'Sales Zone', key: 'salesZone' },
            { header: 'Packing Config', key: 'packConfig' },
            { header: 'Customer', key: 'customer' },
            { header: 'Special Remarks', key: 'specialRemarks' },
        ];
        const rowCount = 100;
        const [products, transporters, plantCodes, salesZones, packConfigs, customers,] = await Promise.all([
            this.prisma.product.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.transporter.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } }),
            this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } }),
            this.prisma.customer.findMany({ orderBy: { name: 'asc' } }),
        ]);
        const dropdowns = {
            product: products.map(p => p.name),
            transporter: transporters.map(t => t.name),
            plantCode: plantCodes.map(p => p.code),
            salesZone: salesZones.map(s => s.name),
            packConfig: packConfigs.map(p => p.configName),
            paymentClearance: ['Yes', 'No'],
            customer: customers.map(c => c.name),
        };
        for (let i = 0; i < rowCount; i++)
            worksheet.addRow({});
        for (const [colKey, values] of Object.entries(dropdowns)) {
            for (let row = 2; row <= rowCount + 1; row++) {
                worksheet.getCell(`${worksheet.getColumn(colKey).letter}${row}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`"${values.join(',')}"`],
                };
            }
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_bulk_template.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    }
    async importBulkOrders(fileBuffer, userId) {
        const workbook = new exceljs_1.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.getWorksheet('Bulk Import');
        if (!worksheet) {
            throw new common_1.BadRequestException('Invalid template format');
        }
        const [products, transporters, plantCodes, salesZones, packConfigs, customers] = await Promise.all([
            this.prisma.product.findMany(),
            this.prisma.transporter.findMany(),
            this.prisma.plantCode.findMany(),
            this.prisma.salesZone.findMany(),
            this.prisma.packConfig.findMany(),
            this.prisma.customer.findMany(),
        ]);
        const maps = {
            product: new Map(products.map(p => [p.name.trim(), p.id])),
            transporter: new Map(transporters.map(t => [t.name.trim(), t.id])),
            plantCode: new Map(plantCodes.map(pc => [pc.code.trim(), pc.id])),
            salesZone: new Map(salesZones.map(sz => [sz.name.trim(), sz.id])),
            packConfig: new Map(packConfigs.map(pc => [pc.configName.trim(), pc.id])),
            customer: new Map(customers.map(c => [c.name.trim(), c.id])),
        };
        const ordersToInsert = [];
        const errors = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1)
                return;
            const [product, saleOrderNumber, outboundDelivery, transferOrder, deliveryDate, transporter, plantCode, paymentClearance, salesZone, packConfig, customer, specialRemarks,] = row.values.slice(1);
            const errList = [];
            const productId = maps.product.get((product || '').toString().trim());
            const transporterId = maps.transporter.get((transporter || '').toString().trim());
            const plantCodeId = maps.plantCode.get((plantCode || '').toString().trim());
            const salesZoneId = maps.salesZone.get((salesZone || '').toString().trim());
            const packConfigId = maps.packConfig.get((packConfig || '').toString().trim());
            const customerId = maps.customer.get((customer || '').toString().trim());
            if (!productId)
                errList.push('Invalid product');
            if (!saleOrderNumber)
                errList.push('Missing saleOrderNumber');
            if (!outboundDelivery)
                errList.push('Missing outboundDelivery');
            if (!transferOrder)
                errList.push('Missing transferOrder');
            if (!deliveryDate)
                errList.push('Missing deliveryDate');
            if (!transporterId)
                errList.push('Invalid transporter');
            if (!plantCodeId)
                errList.push('Invalid plantCode');
            if (!['Yes', 'No', true, false].includes(paymentClearance))
                errList.push('Invalid paymentClearance (must be Yes or No)');
            if (!salesZoneId)
                errList.push('Invalid salesZone');
            if (!packConfigId)
                errList.push('Invalid packConfig');
            if (!customerId)
                errList.push('Invalid customer');
            let deliveryDateISO = null;
            try {
                const parsed = new Date(deliveryDate);
                if (isNaN(parsed.getTime()))
                    throw new Error();
                deliveryDateISO = parsed;
            }
            catch {
                errList.push('Invalid deliveryDate format');
            }
            if (!deliveryDateISO || errList.length > 0) {
                errors.push({ row: rowNumber, errors: errList });
                return;
            }
            ordersToInsert.push({
                productId,
                saleOrderNumber: saleOrderNumber.toString(),
                outboundDelivery: outboundDelivery.toString(),
                transferOrder: transferOrder.toString(),
                deliveryDate: deliveryDateISO,
                transporterId,
                plantCodeId,
                paymentClearance: paymentClearance === 'Yes' || paymentClearance === true,
                salesZoneId,
                packConfigId,
                customerId,
                specialRemarks: specialRemarks ? specialRemarks.toString() : undefined,
                userId,
            });
        });
        if (ordersToInsert.length === 0) {
            throw new common_1.BadRequestException({
                message: 'No valid orders to insert',
                errors,
            });
        }
        try {
            const inserted = await this.prisma.salesOrder.createMany({ data: ordersToInsert });
            return {
                message: `Inserted ${inserted.count} orders. ${errors.length > 0 ? 'Some rows had errors.' : ''}`,
                errors,
                insertedCount: inserted.count,
                preview: ordersToInsert.slice(0, 5),
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Database insertion failed', error.message);
        }
    }
};
exports.SalesOrderService = SalesOrderService;
exports.SalesOrderService = SalesOrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesOrderService);
//# sourceMappingURL=sales-order.service.js.map