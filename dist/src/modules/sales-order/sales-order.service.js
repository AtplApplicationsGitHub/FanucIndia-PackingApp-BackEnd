"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesOrderService = void 0;
const common_1 = require("@nestjs/common");
const exceljs_1 = require("exceljs");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
let SalesOrderService = class SalesOrderService {
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
            { header: 'Special Remarks', key: 'specialRemarks' },
        ];
        const rowCount = 100;
        const [products, transporters, plantCodes, salesZones, packConfigs] = await Promise.all([
            prisma.product.findMany({ orderBy: { name: 'asc' } }),
            prisma.transporter.findMany({ orderBy: { name: 'asc' } }),
            prisma.plantCode.findMany({ orderBy: { code: 'asc' } }),
            prisma.salesZone.findMany({ orderBy: { name: 'asc' } }),
            prisma.packConfig.findMany({ orderBy: { configName: 'asc' } }),
        ]);
        const productNames = products.map((p) => p.name);
        const transporterNames = transporters.map((t) => t.name);
        const plantCodeCodes = plantCodes.map((p) => p.code);
        const salesZoneNames = salesZones.map((s) => s.name);
        const packConfigNames = packConfigs.map((p) => p.configName);
        for (let i = 0; i < rowCount; i++)
            worksheet.addRow({});
        const applyDropdown = (colKey, values) => {
            for (let row = 2; row <= rowCount + 1; row++) {
                worksheet.getCell(`${worksheet.getColumn(colKey).letter}${row}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`"${values.join(',')}"`],
                };
            }
        };
        applyDropdown('product', productNames);
        applyDropdown('transporter', transporterNames);
        applyDropdown('plantCode', plantCodeCodes);
        applyDropdown('salesZone', salesZoneNames);
        applyDropdown('packConfig', packConfigNames);
        applyDropdown('paymentClearance', ['Yes', 'No']);
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
        const [products, transporters, plantCodes, salesZones, packConfigs] = await Promise.all([
            prisma.product.findMany(),
            prisma.transporter.findMany(),
            prisma.plantCode.findMany(),
            prisma.salesZone.findMany(),
            prisma.packConfig.findMany(),
        ]);
        const productMap = new Map(products.map((p) => [p.name.trim(), p.id]));
        const transporterMap = new Map(transporters.map((t) => [t.name.trim(), t.id]));
        const plantCodeMap = new Map(plantCodes.map((pc) => [pc.code.trim(), pc.id]));
        const salesZoneMap = new Map(salesZones.map((sz) => [sz.name.trim(), sz.id]));
        const packConfigMap = new Map(packConfigs.map((pc) => [pc.configName.trim(), pc.id]));
        const ordersToInsert = [];
        const errors = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1)
                return;
            const [product, saleOrderNumber, outboundDelivery, transferOrder, deliveryDate, transporter, plantCode, paymentClearance, salesZone, packConfig, specialRemarks,] = row.values.slice(1);
            if (!product && !saleOrderNumber)
                return;
            const productId = productMap.get((product || '').toString().trim());
            const transporterId = transporterMap.get((transporter || '').toString().trim());
            const plantCodeId = plantCodeMap.get((plantCode || '').toString().trim());
            const salesZoneId = salesZoneMap.get((salesZone || '').toString().trim());
            const packConfigId = packConfigMap.get((packConfig || '').toString().trim());
            const errList = [];
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
            if (paymentClearance !== 'Yes' &&
                paymentClearance !== 'No' &&
                paymentClearance !== true &&
                paymentClearance !== false)
                errList.push('Invalid paymentClearance (must be Yes or No)');
            if (!salesZoneId)
                errList.push('Invalid salesZone');
            if (!packConfigId)
                errList.push('Invalid packConfig');
            if (errList.length > 0) {
                errors.push({ row: rowNumber, errors: errList });
                return;
            }
            let deliveryDateISO;
            try {
                deliveryDateISO = new Date(deliveryDate);
                if (isNaN(deliveryDateISO.getTime()))
                    throw new Error();
            }
            catch {
                errors.push({
                    row: rowNumber,
                    errors: ['Invalid deliveryDate format'],
                });
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
        const inserted = await prisma.salesOrder.createMany({
            data: ordersToInsert,
        });
        return {
            message: `Inserted ${inserted.count} orders. ${errors.length > 0 ? 'Some rows had errors.' : ''}`,
            errors,
            insertedCount: inserted.count,
            preview: ordersToInsert.slice(0, 5),
        };
    }
};
exports.SalesOrderService = SalesOrderService;
exports.SalesOrderService = SalesOrderService = __decorate([
    (0, common_1.Injectable)()
], SalesOrderService);
//# sourceMappingURL=sales-order.service.js.map