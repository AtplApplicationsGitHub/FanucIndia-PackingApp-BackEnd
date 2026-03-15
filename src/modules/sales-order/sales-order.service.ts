import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class SalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async exportSalesExcel(userId: number, filters: any): Promise<Buffer> {
    const authUserId = Number(userId);
    if (!Number.isFinite(authUserId)) {
      throw new BadRequestException('Invalid userId in request context');
    }
    const where: any = { userId: authUserId };

    if (filters.search) {
      const searchStr = filters.search.trim();
      const s = { contains: searchStr, mode: 'insensitive' };

      where.OR = [
        { saleOrderNumber: s },
        { outboundDelivery: s },
        { transferOrder: s },
        { plantCode: s },
        { specialRemarks: s },
        { status: s },
        { customerNameText: s },
        { product: { is: { name: s } } },
        { transporter: { is: { name: s } } },
        { salesZone: { is: { name: s } } },
        { packConfig: { is: { configName: s } } },
        { customer: { is: { name: s } } },
      ];

      const lowerSearch = searchStr.toLowerCase();
      if (['yes', 'true'].includes(lowerSearch)) {
        where.OR.push({ paymentClearance: true });
      } else if (['no', 'false'].includes(lowerSearch)) {
        where.OR.push({ paymentClearance: false });
      }
    }
    if (filters.paymentClearance !== undefined)
      where.paymentClearance = filters.paymentClearance === 'true';
    if (filters.salesZoneId)
      where.salesZoneId = parseInt(filters.salesZoneId, 10);
    if (filters.status) {
      if (filters.status === 'None') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          { OR: [{ status: null }, { status: '' }] },
        ];
      } else {
        where.status = filters.status;
      }
    } else if (filters.excludeStatus) { 
        where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { status: { not: filters.excludeStatus } },
            { status: null },
            { status: '' },
          ],
        },
      ];
    }
    const parseYMD = (s: string) => {
      const datePart = s.includes('T') ? s.split('T')[0] : s;
      const [y, m, d] = datePart.split('-').map(Number);
      return { y, m, d };
    };

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    if (filters.startDate || filters.endDate) {
      const range: { gte?: Date; lt?: Date } = {};
      if (filters.startDate) {
        const { y, m, d } = parseYMD(filters.startDate);
        range.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
      }
      if (filters.endDate) {
        const { y, m, d } = parseYMD(filters.endDate);
        range.lt = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);
      }
      where.deliveryDate = { ...(where.deliveryDate as object), ...range };
    }

    const orders = await this.prisma.salesOrder.findMany({
      where,
      include: {
        product: true,
        salesZone: true,
        packConfig: true,
        transporter: true,
        customer: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
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
      { header: 'Label Remarks', key: 'labelRemarks', width: 30 },
    ];

    orders.forEach((order) => {
      worksheet.addRow({
        product: order.product?.name || '',
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery || '',
        transferOrder: order.transferOrder || '',
        deliveryDate: order.deliveryDate
          ? order.deliveryDate.toISOString().split('T')[0]
          : '',
        transporter: order.transporter?.name || '',
        plantCode: order.plantCode || '',
        paymentClearance: order.paymentClearance ? 'Yes' : 'No',
        salesZone: order.salesZone?.name || '',
        packConfig: order.packConfig?.configName || '',
        customer: order.customer?.name || '',
        specialRemarks: order.specialRemarks || '',
        additionalRemarks: order.additionalRemarks || '',
        labelRemarks: order.labelRemarks || '',
      });
    });

    const BLANK_ROWS_COUNT = 100;
    for (let i = 0; i < BLANK_ROWS_COUNT; i++) {
      worksheet.addRow({});
    }

    const refSheet = workbook.addWorksheet('ReferenceData');
    refSheet.state = 'hidden';

    const [products, transporters, salesZones, packConfigs, customers] = await Promise.all([
      this.prisma.product.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.transporter.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } }),
      this.prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const dropdowns: Record<string, string[]> = {
      Product: products.map((p) => p.name),
      Transporter: transporters.map((t) => t.name),
      'Sales Zone': salesZones.map((s) => s.name),
      'Packing Config': packConfigs.map((p) => p.configName),
      'Payment Clearance': ['Yes', 'No'],
      Customer: customers.map((c) => c.name),
    };

    const dropdownKeys = Object.keys(dropdowns);
    dropdownKeys.forEach((key, idx) => {
      const values = dropdowns[key];
      if (values.length > 0) {
        refSheet.getColumn(idx + 1).values = [key, ...values];
      }
    });

    dropdownKeys.forEach((key, idx) => {
      const values = dropdowns[key];
      if (values.length === 0) return;

      const colLetter = refSheet.getColumn(idx + 1).letter;
      const lastRow = values.length + 1;
      const formula = `ReferenceData!$${colLetter}$2:$${colLetter}$${lastRow}`;

      const targetCol = worksheet.columns.find(c => c.header === key);
      if (targetCol) {
        const totalRows = orders.length + BLANK_ROWS_COUNT + 1;
        for (let row = 2; row <= totalRows; row++) {
          worksheet.getCell(`${targetCol.letter}${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [formula],
          };
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  async importBulkOrders(fileBuffer: any, userId: number) {
    let workbook: ExcelJS.Workbook;
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
    } catch (err: any) {
      throw new BadRequestException('Invalid Excel file format', err.message);
    }

    let worksheet = workbook.getWorksheet('Bulk Import');
    if (!worksheet) {
      worksheet = workbook.getWorksheet(1);
    }
    if (!worksheet) {
      throw new BadRequestException('Worksheet not found in Excel file');
    }

    let products, transporters, salesZones, packConfigs, customers;
    try {
      [products, transporters, salesZones, packConfigs, customers] = await Promise.all([
        this.prisma.product.findMany(),
        this.prisma.transporter.findMany(),
        this.prisma.salesZone.findMany(),
        this.prisma.packConfig.findMany(),
        this.prisma.customer.findMany(),
      ]);
    } catch (err: any) {
      throw new InternalServerErrorException('Failed to retrieve reference data', err.message);
    }

    const maps = {
      product: new Map<string, number>(products.map((p: any) => [p.name.trim().toLowerCase(), p.id])),
      transporter: new Map<string, number>(transporters.map((t: any) => [t.name.trim().toLowerCase(), t.id])),
      salesZone: new Map<string, number>(salesZones.map((sz: any) => [sz.name.trim().toLowerCase(), sz.id])),
      packConfig: new Map<string, number>(packConfigs.map((pc: any) => [pc.configName.trim().toLowerCase(), pc.id])),
      customer: new Map<string, { id: number; address: string }>(
        customers.map((c: any) => [c.name.trim().toLowerCase(), { id: c.id, address: c.address }])
      ),
    };

    const ordersToUpsert: any[] = [];
    const errors: { row: number; errors: string[] }[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const [
        product, saleOrderNumber, outboundDelivery, transferOrder, deliveryDate,
        transporter, plantCode, paymentClearance, salesZone, packConfig,
        customer, specialRemarks, additionalRemarks, labelRemarks,
      ] = (row.values as any[]).slice(1);

      const rowErrors: string[] = [];

      let productNameRaw = (product || '').toString().trim();
      if (!productNameRaw) productNameRaw = 'FA';
      
      const transporterNameRaw = (transporter || '').toString().trim();
      const rawPlantCode = (plantCode || '').toString().trim();
      const plantCodeString = rawPlantCode === '' ? null : rawPlantCode;

      const salesZoneNameRaw = (salesZone || '').toString().trim().toLowerCase();
      const salesZoneId = maps.salesZone.get(salesZoneNameRaw);

      const packConfigName = (packConfig || '').toString().trim();
      let packConfigId: number | null = null;
      if (packConfigName) {
        const foundId = maps.packConfig.get(packConfigName.toLowerCase());
        if (foundId) {
          packConfigId = foundId;
        } else {
          rowErrors.push(`Invalid packConfig: ${packConfigName}`);
        }
      }

      const customerNameRaw = (customer || '').toString().trim();
      const customerData = maps.customer.get(customerNameRaw.toLowerCase());
      const customerId = customerData?.id;
      const customerAddress = customerData?.address;

      if (!saleOrderNumber) rowErrors.push('Missing saleOrderNumber');
      else if (saleOrderNumber.toString().trim().length < 10) rowErrors.push('Sale Order Number must be at least 10 characters');
      
      if (!outboundDelivery) rowErrors.push('Missing outboundDelivery');
      if (!deliveryDate) rowErrors.push('Missing deliveryDate');
      if (!transporterNameRaw) rowErrors.push('Missing transporter');
      
      if (!['Yes', 'No', true, false, 'yes', 'no'].includes(paymentClearance?.toString())) {
        rowErrors.push('Invalid paymentClearance (must be Yes or No)');
      }

      if (!salesZoneId) rowErrors.push('Invalid salesZone');
      if (!customerNameRaw) rowErrors.push('Missing customer Name');

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
        ordersToUpsert.push({
          rowNumber,
          productName: productNameRaw,
          saleOrderNumber: saleOrderNumber.toString(),
          outboundDelivery: outboundDelivery.toString(),
          transferOrder: transferOrder ? transferOrder.toString() : null,
          plantCode: plantCodeString,
          packConfigId: packConfigId,
          deliveryDate: deliveryDateObj,
          transporterName: transporterNameRaw,
          paymentClearance: paymentClearance?.toString().toLowerCase() === 'yes' || paymentClearance === true,
          salesZoneId,
          customerId,
          customerName: customerNameRaw,
          specialRemarks: specialRemarks?.toString() || null,
          additionalRemarks: additionalRemarks?.toString() || null,
          labelRemarks: labelRemarks?.toString() || null,
          address: customerAddress,
          userId,
        });
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Import failed due to errors in the file. No orders were processed.',
        errors,
      });
    }

    if (ordersToUpsert.length === 0) {
      throw new BadRequestException({ message: 'No valid orders found to process.' });
    }

    const transferOrders = ordersToUpsert.map(o => o.transferOrder).filter(t => !!t);
    const soObdPairs = ordersToUpsert.map(o => `${o.saleOrderNumber}_${o.outboundDelivery}`);
    
    const hasDuplicates = (arr: string[]) => new Set(arr).size !== arr.length;
    
    if (hasDuplicates(transferOrders)) {
      throw new BadRequestException('The import file contains duplicate Transfer Order numbers.');
    }
    if (hasDuplicates(soObdPairs)) {
      throw new BadRequestException('The import file contains identical Sale Order + Outbound Delivery combinations.');
    }

    const existingOrders = await this.prisma.salesOrder.findMany({
      where: {
        OR: ordersToUpsert.map(o => ({
          saleOrderNumber: o.saleOrderNumber,
          outboundDelivery: o.outboundDelivery
        }))
      },
    });

    const existingMap = new Map();
    existingOrders.forEach(o => existingMap.set(`${o.saleOrderNumber}_${o.outboundDelivery}`, o));

    try {
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      
      const result = await this.prisma.$transaction(async (tx) => {
        let insertedCount = 0;
        let updatedCount = 0;

        for (const orderData of ordersToUpsert) {
          let finalProductId: number | null = null;
          let foundProdId = maps.product.get(orderData.productName.toLowerCase());
          if (!foundProdId) {
            const newProduct = await tx.product.create({ data: { name: orderData.productName } });
            foundProdId = newProduct.id;
            maps.product.set(orderData.productName.toLowerCase(), foundProdId);
          }
          finalProductId = foundProdId;

          let finalCustomerId = orderData.customerId;
          let finalCustomerAddress = orderData.address;
          if (!finalCustomerId) {
            let foundCust = maps.customer.get(orderData.customerName.toLowerCase());
            if (!foundCust) {
              const newCustomer = await tx.customer.create({ data: { name: orderData.customerName } });
              foundCust = { id: newCustomer.id, address: newCustomer.address || '' };
              maps.customer.set(orderData.customerName.toLowerCase(), foundCust);
            }
            finalCustomerId = foundCust.id;
            finalCustomerAddress = foundCust.address;
          }

          let finalTransporterId: number | null = null;
          let foundTransId = maps.transporter.get(orderData.transporterName.toLowerCase());
          if (!foundTransId) {
            const newTransporter = await tx.transporter.create({ data: { name: orderData.transporterName } });
            foundTransId = newTransporter.id;
            maps.transporter.set(orderData.transporterName.toLowerCase(), foundTransId);
          }
          finalTransporterId = foundTransId;

          const { customerName, transporterName, productName, rowNumber, ...dataToSave } = orderData;
          
          const compositeKey = `${orderData.saleOrderNumber}_${orderData.outboundDelivery}`;
          const existing = existingMap.get(compositeKey);

          if (existing) {
            await tx.salesOrder.update({
              where: { id: existing.id },
              data: {
                ...dataToSave,
                productId: finalProductId,
                customerId: finalCustomerId,
                transporterId: finalTransporterId,
                address: finalCustomerAddress,
              },
            });
            updatedCount++;
          } else {
            const newOrder = await tx.salesOrder.create({
              data: {
                ...dataToSave,
                productId: finalProductId,
                customerId: finalCustomerId,
                transporterId: finalTransporterId,
                address: finalCustomerAddress,
              },
            });

            const statuses = ['To be Issued', 'Under Issue', 'Issued', 'Under Packing', 'Packed', 'WIP Storage', 'Ready for Dispatch', 'Dispatched'];
            await tx.sO_Status_Stepper.createMany({
              data: statuses.map((status) => ({
                salesOrderNumber: newOrder.saleOrderNumber,
                salesOrderId: newOrder.id,
                status: status,
                createdDateTime: status === 'To be Issued' ? newOrder.createdAt : null,
                updatedBy: null,
              })),
            });
            insertedCount++;
          }
          await delay(10);
        }
        return { insertedCount, updatedCount };
      });

      return {
        message: `Processed successfully. Inserted: ${result.insertedCount}, Updated: ${result.updatedCount}`,
        errors,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
      };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[])?.join(', ');
        throw new ConflictException(`Database error: A constraint failed. The value for '${target}' must be unique.`);
      }
      throw new InternalServerErrorException('Database operation failed', err.message);
    }
  }

  async resetSalesOrder(id: number, username: string) {
    const so = await this.prisma.salesOrder.findUnique({
      where: { id },
      select: { saleOrderNumber: true },
    });

    if (!so) {
      throw new NotFoundException(`Sales Order with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.eRP_Material_Data.deleteMany({
        where: { salesOrderId: id },
      });

      const updatedSo = await tx.salesOrder.update({
        where: { id },
        data: {
          status: null,
          priority: null,
          assignedUserId: null,
          isErpImported: 0,
          skipStage: false,
          UpdatedBy: username,
          UpdatedDate: new Date(),
        },
      });

      return {
        message: 'Sales Order has been reset successfully.',
        data: updatedSo,
      };
    });
  }
}