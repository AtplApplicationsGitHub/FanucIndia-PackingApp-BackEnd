import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Workbook } from 'exceljs';
import { Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async generateBulkTemplate(res: Response) {
    try {
      const workbook = new Workbook();
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

      // Fetch reference data in parallel
      const [
        products,
        transporters,
        plantCodes,
        salesZones,
        packConfigs,
        customers,
      ] = await Promise.all([
        this.prisma.product.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.transporter.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } }),
        this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } }),
        this.prisma.customer.findMany({ orderBy: { name: 'asc' } }),
      ]);

      const dropdowns: Record<string, string[]> = {
        product: products.map(p => p.name),
        transporter: transporters.map(t => t.name),
        plantCode: plantCodes.map(p => p.code),
        salesZone: salesZones.map(s => s.name),
        packConfig: packConfigs.map(p => p.configName),
        paymentClearance: ['Yes', 'No'],
        customer: customers.map(c => c.name),
      };

      const ROW_COUNT = 100;
      for (let i = 0; i < ROW_COUNT; i++) worksheet.addRow({});

      // Attach data validations
      for (const [colKey, values] of Object.entries(dropdowns)) {
        const letter = worksheet.getColumn(colKey).letter;
        for (let row = 2; row <= ROW_COUNT + 1; row++) {
          worksheet.getCell(`${letter}${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`"${values.join(',')}"`],
          };
        }
      }

      // Stream back the file
      res
        .status(200)
        .set({
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition':
            'attachment; filename="sales_bulk_template.xlsx"',
        });
      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to generate Excel template',
        err.message,
      );
    }
  }

  async importBulkOrders(fileBuffer: any, userId: number) {
    let workbook: Workbook;
    try {
      workbook = new Workbook();
      await workbook.xlsx.load(fileBuffer);
    } catch (err: any) {
      throw new BadRequestException(
        'Invalid Excel file format',
        err.message,
      );
    }

    const worksheet = workbook.getWorksheet('Bulk Import');
    if (!worksheet) {
      throw new BadRequestException('Invalid template format');
    }

    // Load all lookup tables
    let products, transporters, plantCodes, salesZones, packConfigs, customers;
    try {
      [
        products,
        transporters,
        plantCodes,
        salesZones,
        packConfigs,
        customers,
      ] = await Promise.all([
        this.prisma.product.findMany(),
        this.prisma.transporter.findMany(),
        this.prisma.plantCode.findMany(),
        this.prisma.salesZone.findMany(),
        this.prisma.packConfig.findMany(),
        this.prisma.customer.findMany(),
      ]);
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to retrieve reference data',
        err.message,
      );
    }

    // Build name→ID maps
    const maps = {
      product: new Map(products.map(p => [p.name.trim(), p.id])),
      transporter: new Map(transporters.map(t => [t.name.trim(), t.id])),
      plantCode: new Map(plantCodes.map(pc => [pc.code.trim(), pc.id])),
      salesZone: new Map(salesZones.map(sz => [sz.name.trim(), sz.id])),
      packConfig: new Map(packConfigs.map(pc => [pc.configName.trim(), pc.id])),
      customer: new Map(customers.map(c => [c.name.trim(), c.id])),
    };

    const ordersToInsert: any[] = [];
    const errors: { row: number; errors: string[] }[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const [
        product,
        saleOrderNumber,
        outboundDelivery,
        transferOrder,
        deliveryDate,
        transporter,
        plantCode,
        paymentClearance,
        salesZone,
        packConfig,
        customer,
        specialRemarks,
      ] = (row.values as any[]).slice(1);

      const rowErrors: string[] = [];
      const productId = maps.product.get((product || '').toString().trim());
      const transporterId = maps.transporter.get((transporter || '').toString().trim());
      const plantCodeId = maps.plantCode.get((plantCode || '').toString().trim());
      const salesZoneId = maps.salesZone.get((salesZone || '').toString().trim());
      const packConfigId = maps.packConfig.get((packConfig || '').toString().trim());
      const customerId = maps.customer.get((customer || '').toString().trim());

      if (!productId) rowErrors.push('Invalid product');
      if (!saleOrderNumber) rowErrors.push('Missing saleOrderNumber');
      if (!outboundDelivery) rowErrors.push('Missing outboundDelivery');
      if (!transferOrder) rowErrors.push('Missing transferOrder');
      if (!deliveryDate) rowErrors.push('Missing deliveryDate');
      if (!transporterId) rowErrors.push('Invalid transporter');
      if (!plantCodeId) rowErrors.push('Invalid plantCode');
      if (!['Yes', 'No', true, false].includes(paymentClearance))
        rowErrors.push('Invalid paymentClearance (must be Yes or No)');
      if (!salesZoneId) rowErrors.push('Invalid salesZone');
      if (!packConfigId) rowErrors.push('Invalid packConfig');
      if (!customerId) rowErrors.push('Invalid customer');

      let deliveryDateObj: Date | null = null;
      if (deliveryDate) {
        const dt = new Date(deliveryDate);
        if (isNaN(dt.getTime())) {
          rowErrors.push('Invalid deliveryDate format');
        } else {
          deliveryDateObj = dt;
        }
      }

      if (rowErrors.length) {
        errors.push({ row: rowNumber, errors: rowErrors });
      } else {
        ordersToInsert.push({
          productId,
          saleOrderNumber: saleOrderNumber.toString(),
          outboundDelivery: outboundDelivery.toString(),
          transferOrder: transferOrder.toString(),
          deliveryDate: deliveryDateObj,
          transporterId,
          plantCodeId,
          paymentClearance: paymentClearance === 'Yes' || paymentClearance === true,
          salesZoneId,
          packConfigId,
          customerId,
          specialRemarks: specialRemarks?.toString(),
          userId,
        });
      }
    });

    if (ordersToInsert.length === 0) {
      throw new BadRequestException({
        message: 'No valid orders to insert',
        errors,
      });
    }

    try {
      const result = await this.prisma.salesOrder.createMany({
        data: ordersToInsert,
      });
      return {
        message: `Inserted ${result.count} orders.`,
        errors,
        insertedCount: result.count,
      };
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Duplicate order detected in import; ensure each saleOrderNumber is unique.',
        );
      }
      throw new InternalServerErrorException(
        'Database insertion failed',
        err.message,
      );
    }
  }
}
