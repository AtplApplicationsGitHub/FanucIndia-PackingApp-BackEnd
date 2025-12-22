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
        { header: 'Product', key: 'product', width: 25 },
        { header: 'Sale Order Number', key: 'saleOrderNumber', width: 20 },
        { header: 'Outbound Delivery', key: 'outboundDelivery', width: 20 },
        { header: 'Transfer Order', key: 'transferOrder', width: 20 },
        { header: 'Delivery Date', key: 'deliveryDate', width: 15 },
        { header: 'Transporter', key: 'transporter', width: 20 },
        { header: 'Plant Code', key: 'plantCode', width: 15 },
        { header: 'Payment Clearance', key: 'paymentClearance', width: 15 },
        { header: 'Sales Zone', key: 'salesZone', width: 15 },
        { header: 'Packing Config', key: 'packConfig', width: 20 },
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Special Remarks', key: 'specialRemarks', width: 30 },
        { header: 'Additional Remarks', key: 'additionalRemarks', width: 30 }, 
      ];

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

      const refSheet = workbook.addWorksheet('ReferenceData');
      refSheet.state = 'hidden';

      const dropdowns: Record<string, string[]> = {
        product: products.map((p) => p.name),
        transporter: transporters.map((t) => t.name),
        plantCode: plantCodes.map((p) => p.code),
        salesZone: salesZones.map((s) => s.name),
        packConfig: packConfigs.map((p) => p.configName),
        paymentClearance: ['Yes', 'No'],
        customer: customers.map((c) => c.name),
      };

      const dropdownKeys = Object.keys(dropdowns);

      dropdownKeys.forEach((key, idx) => {
        const values = dropdowns[key];
        if (values.length > 0) {
          refSheet.getColumn(idx + 1).values = [key, ...values];
        }
      });

      const ROW_COUNT = 100;
      for (let i = 0; i < ROW_COUNT; i++) worksheet.addRow({});

      dropdownKeys.forEach((key, idx) => {
        const values = dropdowns[key];
        if (values.length === 0) return;

        const colLetter = refSheet.getColumn(idx + 1).letter;
        const lastRow = values.length + 1; 
        const formula = `ReferenceData!$${colLetter}$2:$${colLetter}$${lastRow}`;

        const targetCol = worksheet.getColumn(key);
        for (let row = 2; row <= ROW_COUNT + 1; row++) {
          worksheet.getCell(`${targetCol.letter}${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [formula],
          };
        }
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="bulk_import_excel.xlsx"'
      );
      return workbook.xlsx.write(res).then(() => {
        res.end();
      });
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
      throw new BadRequestException('Invalid Excel file format', err.message);
    }

    const worksheet = workbook.getWorksheet('Bulk Import');
    if (!worksheet) {
      throw new BadRequestException('Invalid template format');
    }

    let products, transporters, plantCodes, salesZones, packConfigs, customers;
    try {
      [products, transporters, plantCodes, salesZones, packConfigs, customers] =
        await Promise.all([
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

    const maps = {
      product: new Map(products.map((p) => [p.name.trim(), p.id])),
      transporter: new Map(transporters.map((t) => [t.name.trim(), t.id])),
      plantCode: new Map(plantCodes.map((pc) => [pc.code.trim(), pc.id])),
      salesZone: new Map(salesZones.map((sz) => [sz.name.trim(), sz.id])),
      packConfig: new Map(
        packConfigs.map((pc) => [pc.configName.trim(), pc.id]),
      ),
      customer: new Map<string, { id: number; address: string }>(
        customers.map((c) => [c.name.trim(), { id: c.id, address: c.address }]),
      ),
    };

    const ordersToInsert: any[] = [];
    const errors: { row: number; errors: string[] }[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
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
        additionalRemarks,
      ] = (row.values as any[]).slice(1);

      const rowErrors: string[] = [];
      const productId = maps.product.get((product || '').toString().trim());
      const transporterId = maps.transporter.get(
        (transporter || '').toString().trim(),
      );
      const plantCodeId = maps.plantCode.get(
        (plantCode || '').toString().trim(),
      );
      const salesZoneId = maps.salesZone.get(
        (salesZone || '').toString().trim(),
      );
      const packConfigId = maps.packConfig.get(
        (packConfig || '').toString().trim(),
      );

      const customerData = maps.customer.get(
        (customer || '').toString().trim(),
      );
      const customerId = customerData?.id;
      const customerAddress = customerData?.address;

      if (!productId) rowErrors.push('Invalid product');
      if (!saleOrderNumber) {
        rowErrors.push('Missing saleOrderNumber');
      } else if (saleOrderNumber.toString().trim().length < 10) {
        rowErrors.push('Sale Order Number must be at least 10 characters');
      }
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
          paymentClearance:
            paymentClearance === 'Yes' || paymentClearance === true,
          salesZoneId,
          packConfigId,
          customerId,
          specialRemarks: specialRemarks?.toString(),
          additionalRemarks: additionalRemarks?.toString(), 
          address: customerAddress, 
          userId,
        });
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message:
          'Import failed due to errors in the file. No orders were imported.',
        errors,
      });
    }

    if (ordersToInsert.length === 0) {
      throw new BadRequestException({
        message: 'No valid orders found to insert.',
        errors,
      });
    }

    const saleOrderNumbers = ordersToInsert.map((o) => o.saleOrderNumber);
    const outboundDeliveries = ordersToInsert.map((o) => o.outboundDelivery);
    const transferOrders = ordersToInsert.map((o) => o.transferOrder);

    const hasDuplicates = (arr: string[]) => new Set(arr).size !== arr.length;
    if (hasDuplicates(saleOrderNumbers)) {
      throw new BadRequestException(
        'The import file contains duplicate Sale Order Numbers.',
      );
    }
    if (hasDuplicates(outboundDeliveries)) {
      throw new BadRequestException(
        'The import file contains duplicate Outbound Delivery numbers.',
      );
    }
    if (hasDuplicates(transferOrders)) {
      throw new BadRequestException(
        'The import file contains duplicate Transfer Order numbers.',
      );
    }

    const existingOrders = await this.prisma.salesOrder.findMany({
      where: {
        OR: [
          { saleOrderNumber: { in: saleOrderNumbers } },
          { outboundDelivery: { in: outboundDeliveries } },
          { transferOrder: { in: transferOrders } },
        ],
      },
    });

    if (existingOrders.length > 0) {
      const existingSO = existingOrders.find((e) =>
        saleOrderNumbers.includes(e.saleOrderNumber),
      );
      if (existingSO) {
        throw new ConflictException(
          `An order with Sale Order Number '${existingSO.saleOrderNumber}' already exists.`,
        );
      }
      const existingOBD = existingOrders.find((e) =>
        outboundDeliveries.includes(e.outboundDelivery),
      );
      if (existingOBD) {
        throw new ConflictException(
          `An order with Outbound Delivery '${existingOBD.outboundDelivery}' already exists.`,
        );
      }
      const existingTO = existingOrders.find((e) =>
        transferOrders.includes(e.transferOrder),
      );
      if (existingTO) {
        throw new ConflictException(
          `An order with Transfer Order '${existingTO.transferOrder}' already exists.`,
        );
      }
    }

    try {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const insertedCount = await this.prisma.$transaction(async (tx) => {
        let count = 0;
        for (const orderData of ordersToInsert) {
          const newOrder = await tx.salesOrder.create({
            data: orderData,
          });
          count++;

          const statuses = [
            "To be Issued",
            "Under Issue",
            "Issued",
            "Under Packing",
            "Packed",
            "WIP Storage",
            "Ready for Dispatch", 
            "Dispatched"
          ];
          await tx.sO_Status_Stepper.createMany({
            data: statuses.map((status) => ({
              salesOrderNumber: newOrder.saleOrderNumber,
              status: status,
              createdDateTime: status === 'To be Issued' ? newOrder.createdAt : null,
              updatedBy: null,
            })),
          });

          await delay(10);
        }
        return count;
      });

      return {
        message: `Inserted ${insertedCount} orders.`,
        errors,
        insertedCount,
      };
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const target = (err.meta?.target as string[])?.join(', ');
        throw new ConflictException(
          `Database error: A duplicate order was detected. The value for '${target}' must be unique.`,
        );
      }
      throw new InternalServerErrorException(
        'Database insertion failed',
        err.message,
      );
    }
  }
}