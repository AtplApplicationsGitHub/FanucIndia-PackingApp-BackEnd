import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Workbook } from 'exceljs';
import { Response } from 'express';
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
    if (filters.status) where.status = filters.status;
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
        const s = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
        range.gte = s;
      }

      if (filters.endDate) {
        const { y, m, d } = parseYMD(filters.endDate);
        const e = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);
        range.lt = e;
      }

      where.deliveryDate = { ...(where.deliveryDate as object), ...range };
    }

    // 2. Fetch Data
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

    const packConfigs = await this.prisma.packConfig.findMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Orders');

    // 3. Define Columns
    worksheet.columns = [
      { header: 'PRODUCT', key: 'product', width: 20 },
      { header: 'SALE ORDER NUMBER', key: 'saleOrderNumber', width: 25 },
      { header: 'OUT BOUND DELIVERY', key: 'outboundDelivery', width: 25 },
      { header: 'TRANSFER ORDER', key: 'transferOrder', width: 20 },
      { header: 'DELIVERY DATE', key: 'deliveryDate', width: 15 },
      { header: 'TRANSPORTER', key: 'transporter', width: 20 },
      { header: 'PLANT CODE', key: 'plantCode', width: 15 },
      { header: 'PAYMENT CLEARANCE', key: 'paymentClearance', width: 20 },
      { header: 'SALES ZONE', key: 'salesZone', width: 15 },
      { header: 'PACKING CONFIG', key: 'packConfig', width: 20 },
      { header: 'CUSTOMER', key: 'customer', width: 25 },
      { header: 'SPECIAL REMARKS', key: 'specialRemarks', width: 30 },
      { header: 'ADDITIONAL REMARKS', key: 'additionalRemarks', width: 30 },
      { header: 'LABEL REMARKS', key: 'labelRemarks', width: 30 },
    ];

    // 4. Populate Rows
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
        customer: order.customerNameText || order.customer?.name || '',
        specialRemarks: order.specialRemarks || '',
        additionalRemarks: order.additionalRemarks || '',
        labelRemarks: order.labelRemarks || '',
      });
    });

    // 5. Apply Data Validations & Cell Locking
    const editableColumns = [
      'DELIVERY DATE',
      'TRANSPORTER',
      'PLANT CODE',
      'PAYMENT CLEARANCE',
      'PACKING CONFIG',
      'SPECIAL REMARKS',
      'ADDITIONAL REMARKS',
      'LABEL REMARKS',
    ];

    // Protect the entire sheet first
    await worksheet.protect('password123', {
      selectLockedCells: true,
      selectUnlockedCells: true,
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip Header

      // Dropdown for PAYMENT CLEARANCE (Col H / 8)
      row.getCell(8).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Yes,No"'],
      };

      // Dropdown for PACKING CONFIG (Col J / 10)
      if (packConfigs.length > 0) {
        const configNames = packConfigs.map((p) => p.configName).join(',');
        row.getCell(10).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${configNames}"`],
        };
      }

      // Unlock editable columns
      worksheet.columns.forEach((col, index) => {
        if (editableColumns.includes(col.header as string)) {
          row.getCell(index + 1).protection = { locked: false };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  async importSalesExcel(buffer: Buffer, userId: number) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet(1);

    const authUserId = Number(userId);
    if (!Number.isFinite(authUserId)) {
      throw new BadRequestException('Invalid userId in request context');
    }

    const norm = (v: any) => (v ?? '').toString().trim().toLowerCase();

    if (!worksheet)
      throw new BadRequestException('Worksheet not found in Excel file');

    const errors: { row: number; errors: string[] }[] = [];
    const packConfigs = await this.prisma.packConfig.findMany();

    // Array to hold the validated updates so we can run them all at once at the end
    const pendingUpdates: any[] = [];

    // --- PHASE 1: VALIDATE ALL ROWS ---
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      if (!row.hasValues) continue;

      const rowErrors: string[] = [];

      // Extract cells based on the export order
      const productStr = row.getCell(1).value?.toString()?.trim() || '';
      const saleOrderNumber = row.getCell(2).value?.toString()?.trim();
      const outboundDelivery = row.getCell(3).value?.toString()?.trim() || '';
      const transferOrder = row.getCell(4).value?.toString()?.trim() || '';
      const deliveryDateStr = row.getCell(5).value?.toString()?.trim();
      const transporterName = row.getCell(6).value?.toString()?.trim() || '';
      const plantCode = row.getCell(7).value?.toString()?.trim() || '';
      const paymentClearanceStr = row.getCell(8).value?.toString()?.trim();
      const salesZoneStr = row.getCell(9).value?.toString()?.trim() || '';
      const packConfigName = row.getCell(10).value?.toString()?.trim() || '';
      const customerStr = row.getCell(11).value?.toString()?.trim() || '';
      const specialRemarks = row.getCell(12).value?.toString()?.trim() || null;
      const additionalRemarks =
        row.getCell(13).value?.toString()?.trim() || null;
      const labelRemarks = row.getCell(14).value?.toString()?.trim() || null;

      if (!saleOrderNumber) {
        errors.push({
          row: rowNumber,
          errors: ['Sale Order Number is missing'],
        });
        continue;
      }

      // Fetch the original order to apply Strict Validation checks
      const originalOrder = await this.prisma.salesOrder.findUnique({
        where: { saleOrderNumber },
        include: { product: true, salesZone: true, customer: true },
      });

      if (!originalOrder) {
        rowErrors.push(`Order ${saleOrderNumber} not found.`);
        errors.push({ row: rowNumber, errors: rowErrors });
        continue;
      }

      if (originalOrder.userId !== authUserId) {
        rowErrors.push(
          `You do not have permission to update order ${saleOrderNumber}.`,
        );
      }

      const restrictedStatuses = [
        'Packed',
        'WIP Storage',
        'Ready for Dispatch',
        'Dispatched',
      ];
      if (
        originalOrder.status &&
        restrictedStatuses.includes(originalOrder.status)
      ) {
        rowErrors.push(
          `Cannot modify order. The packing stage is already completed (Current Status: ${originalOrder.status}).`,
        );
      }

      if (norm(productStr) !== norm(originalOrder.product?.name))
        rowErrors.push('Product cannot be modified.');
      if (norm(outboundDelivery) !== norm(originalOrder.outboundDelivery))
        rowErrors.push('Outbound Delivery cannot be modified.');
      if (norm(transferOrder) !== norm(originalOrder.transferOrder))
        rowErrors.push('Transfer Order cannot be modified.');
      if (norm(salesZoneStr) !== norm(originalOrder.salesZone?.name))
        rowErrors.push('Sales Zone cannot be modified.');
      if (
        norm(customerStr) !==
        norm(originalOrder.customerNameText || originalOrder.customer?.name)
      )
        rowErrors.push('Customer cannot be modified.');
      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, errors: rowErrors });
        continue;
      }

      // Prepare Editable Update Data
      const updateData: any = {};

      if (deliveryDateStr) updateData.deliveryDate = new Date(deliveryDateStr);
      updateData.plantCode = plantCode;

      if (paymentClearanceStr) {
        updateData.paymentClearance =
          paymentClearanceStr.toLowerCase() === 'yes';
      }

      if (packConfigName) {
        const foundConfig = packConfigs.find(
          (p) => norm(p.configName) === norm(packConfigName),
        );
        if (foundConfig) updateData.packConfigId = foundConfig.id;
        else rowErrors.push(`Invalid Pack Config: ${packConfigName}`);
      }

      updateData.specialRemarks = specialRemarks;
      updateData.additionalRemarks = additionalRemarks;
      updateData.labelRemarks = labelRemarks;

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, errors: rowErrors });
        continue;
      }

      // If the row passed all validations, stage it in memory
      pendingUpdates.push({
        saleOrderNumber,
        transporterName, // Keep this to dynamically resolve in Phase 2
        updateData,
      });
    }

    // --- PHASE 2: ABORT IF ANY ERRORS EXIST ---
    // If there is even a single error, reject the entire file without writing to DB
    if (errors.length > 0) {
      console.error('================ EXCEL IMPORT ERRORS ================');
      console.dir(errors, { depth: null });
      console.error('=====================================================');
      throw new BadRequestException({
        message: `Import failed. No orders were updated due to errors in ${errors.length} rows. Please fix the file and try again.`,
        errors, // Sending the errors back so the frontend can display exactly what went wrong
      });
    }

    // --- PHASE 3: EXECUTE ALL UPDATES ---
    // At this point, we guarantee the file has 0 errors
    let updatedCount = 0;
    for (const update of pendingUpdates) {
      // Resolve dynamic transporter creation
      if (update.transporterName) {
        const transporter = await this.prisma.transporter.findFirst({
          where: {
            name: { equals: update.transporterName, mode: 'insensitive' },
          },
        });

        if (transporter) {
          update.updateData.transporterId = transporter.id;
        } else {
          // Create a new transporter
          const newTransporter = await this.prisma.transporter.create({
            data: { name: update.transporterName },
          });
          update.updateData.transporterId = newTransporter.id;
        }
      }

      // Perform the Database Update
      await this.prisma.salesOrder.update({
        where: { saleOrderNumber: update.saleOrderNumber },
        data: update.updateData,
      });
      updatedCount++;
    }

    return {
      message: `Successfully updated ${updatedCount} orders from Excel.`,
    };
  }

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
        { header: 'Label Remarks', key: 'labelRemarks', width: 30 },
      ];

      const [
        products,
        transporters,
        // plantCodes,
        salesZones,
        packConfigs,
        customers,
      ] = await Promise.all([
        this.prisma.product.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.transporter.findMany({ orderBy: { name: 'asc' } }),
        // this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } }),
        this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } }),
        this.prisma.customer.findMany({ orderBy: { name: 'asc' } }),
      ]);

      const refSheet = workbook.addWorksheet('ReferenceData');
      refSheet.state = 'hidden';

      const dropdowns: Record<string, string[]> = {
        product: products.map((p) => p.name),
        transporter: transporters.map((t) => t.name),
        // plantCode: plantCodes.map((p) => p.code),
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
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="bulk_import_excel.xlsx"',
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

    // let products, transporters, plantCodes, salesZones, packConfigs, customers;
    let products, transporters, salesZones, packConfigs, customers;
    try {
      // [products, transporters, plantCodes, salesZones, packConfigs, customers] =
      [products, transporters, salesZones, packConfigs, customers] =
        await Promise.all([
          this.prisma.product.findMany(),
          this.prisma.transporter.findMany(),
          // this.prisma.plantCode.findMany(),
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
      product: new Map<string, number>(
        products.map((p: any) => [p.name.trim(), p.id]),
      ),
      transporter: new Map<string, number>(
        transporters.map((t: any) => [t.name.trim(), t.id]),
      ),
      // plantCode: new Map(plantCodes.map((pc: any) => [pc.code.trim(), pc.id])),
      salesZone: new Map<string, number>(
        salesZones.map((sz: any) => [sz.name.trim(), sz.id]),
      ),
      packConfig: new Map<string, number>(
        packConfigs.map((pc: any) => [pc.configName.trim(), pc.id]),
      ),
      customer: new Map<string, { id: number; address: string }>(
        customers.map((c: any) => [
          c.name.trim(),
          { id: c.id, address: c.address },
        ]),
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
        labelRemarks,
      ] = (row.values as any[]).slice(1);

      const rowErrors: string[] = [];

      let productName = (product || '').toString().trim();
      if (!productName) {
        productName = 'FA';
      }
      const productId = maps.product.get(productName);

      const transporterNameRaw = (transporter || '').toString().trim();
      const transporterId = maps.transporter.get(transporterNameRaw);

      const rawPlantCode = (plantCode || '').toString().trim();
      const plantCodeString = rawPlantCode === '' ? null : rawPlantCode;

      const salesZoneId = maps.salesZone.get(
        (salesZone || '').toString().trim(),
      );

      const packConfigName = (packConfig || '').toString().trim();
      let packConfigId: number | null = null;
      if (packConfigName) {
        const foundId = maps.packConfig.get(packConfigName);
        if (foundId) {
          packConfigId = foundId;
        } else {
          rowErrors.push(`Invalid packConfig: ${packConfigName}`);
        }
      }

      const customerNameRaw = (customer || '').toString().trim();
      const customerData = maps.customer.get(customerNameRaw);
      const customerId = customerData?.id;
      const customerAddress = customerData?.address;

      if (!productId) {
        rowErrors.push(
          `Invalid product (Defaults to 'FA', but 'FA' not found in system)`,
        );
      }

      if (!saleOrderNumber) {
        rowErrors.push('Missing saleOrderNumber');
      } else if (saleOrderNumber.toString().trim().length < 10) {
        rowErrors.push('Sale Order Number must be at least 10 characters');
      }

      if (!outboundDelivery) rowErrors.push('Missing outboundDelivery');

      if (!deliveryDate) rowErrors.push('Missing deliveryDate');

      // if (!transporterId) rowErrors.push('Invalid transporter');
      if (!transporterNameRaw) {
        rowErrors.push('Missing transporter');
      }

      if (!['Yes', 'No', true, false].includes(paymentClearance))
        rowErrors.push('Invalid paymentClearance (must be Yes or No)');

      if (!salesZoneId) rowErrors.push('Invalid salesZone');

      // if (!customerId) rowErrors.push('Invalid customer');

      if (!customerNameRaw) {
        rowErrors.push('Missing customer Name');
      }

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

          transferOrder: transferOrder ? transferOrder.toString() : null,
          plantCode: plantCodeString,
          packConfigId: packConfigId,

          deliveryDate: deliveryDateObj,
          transporterId,
          transporterName: transporterNameRaw,

          paymentClearance:
            paymentClearance === 'Yes' || paymentClearance === true,
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
    const transferOrders = ordersToInsert
      .map((o) => o.transferOrder)
      .filter((t): t is string => !!t);

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
      const existingTO = existingOrders.find(
        (e) => e.transferOrder && transferOrders.includes(e.transferOrder),
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
          let finalCustomerId = orderData.customerId;
          let finalCustomerAddress = orderData.address;

          if (!finalCustomerId && orderData.customerName) {
            let found = maps.customer.get(orderData.customerName);

            if (!found) {
              const newCustomer = await tx.customer.create({
                data: { name: orderData.customerName },
              });

              found = {
                id: newCustomer.id,
                address: newCustomer.address || '',
              };

              maps.customer.set(orderData.customerName, found);
            }

            finalCustomerId = found.id;
            finalCustomerAddress = found.address;
          }

          let finalTransporterId = orderData.transporterId;

          if (!finalTransporterId && orderData.transporterName) {
            let foundId = maps.transporter.get(orderData.transporterName);

            if (!foundId) {
              const newTransporter = await tx.transporter.create({
                data: { name: orderData.transporterName },
              });

              foundId = newTransporter.id;

              maps.transporter.set(orderData.transporterName, foundId);
            }

            finalTransporterId = foundId;
          }

          const { customerName, transporterName, ...dataToSave } = orderData;

          const newOrder = await tx.salesOrder.create({
            data: {
              ...dataToSave,
              customerId: finalCustomerId,
              transporterId: finalTransporterId,
              address: finalCustomerAddress,
            },
          });

          count++;

          const statuses = [
            'To be Issued',
            'Under Issue',
            'Issued',
            'Under Packing',
            'Packed',
            'WIP Storage',
            'Ready for Dispatch',
            'Dispatched',
          ];
          await tx.sO_Status_Stepper.createMany({
            data: statuses.map((status) => ({
              salesOrderNumber: newOrder.saleOrderNumber,
              status: status,
              createdDateTime:
                status === 'To be Issued' ? newOrder.createdAt : null,
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
        where: { saleOrderNumber: so.saleOrderNumber },
      });

      const updatedSo = await tx.salesOrder.update({
        where: { id },
        data: {
          status: null,
          priority: null,
          assignedUserId: null,
          isErpImported: 0,
          skipIssueStage: false,
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
