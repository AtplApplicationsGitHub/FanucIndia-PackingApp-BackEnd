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
import {
  getDateOnlyRange,
  parseYmdDateOnly,
} from '../../common/utils/date-only.util';

@Injectable()
export class SalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async exportSalesExcel(userId: number, filters: any): Promise<Buffer> {
    const authUserId = Number(userId);
    if (!Number.isFinite(authUserId)) {
      throw new BadRequestException('Invalid userId in request context');
    }

    // 1. Fetch the user to determine their Zone authorization
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    const where: any = {};

    // 2. Base Query: Restrict to Zone if applicable, otherwise fallback to userId
    if (user?.salesZoneId) {
      where.salesZoneId = user.salesZoneId;
    } else {
      where.userId = authUserId;
    }

    if (filters.search) {
      const searchStr = filters.search.trim().replace(/\s+/g, ' ');
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

    // Ensure frontend filters cannot bypass the user's zone restriction
    if (filters.salesZoneId) {
      const reqZone = parseInt(filters.salesZoneId, 10);
      if (user?.salesZoneId && reqZone !== user.salesZoneId) {
        where.salesZoneId = user.salesZoneId;
      } else {
        where.salesZoneId = reqZone;
      }
    }

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

    const deliveryDateRange = getDateOnlyRange(
      filters.startDate,
      filters.endDate,
    );

    if (deliveryDateRange) {
      where.deliveryDate = {
        ...(where.deliveryDate as object),
        ...deliveryDateRange,
      };
    }

    let orders: any[] = [];

    if (filters.blank !== 'true') {
      orders = await this.prisma.salesOrder.findMany({
        where,
        include: {
          product: true,
          salesZone: true,
          packConfig: true,
          transporter: true,
          customer: true,
        },
      });
    }

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

    // 3. Restrict "Sales Zone" Dropdown Reference Data to the user's specific zone
    let salesZonesData;
    if (user?.salesZoneId) {
      salesZonesData = await this.prisma.salesZone.findMany({
        where: { id: user.salesZoneId },
      });
    } else {
      salesZonesData = await this.prisma.salesZone.findMany({
        orderBy: { name: 'asc' },
      });
    }

    const [products, transporters, packConfigs, customers] = await Promise.all([
      this.prisma.product.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.transporter.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } }),
      this.prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const dropdowns: Record<string, string[]> = {
      Product: products.map((p) => p.name),
      Transporter: transporters.map((t) => t.name),
      'Sales Zone': salesZonesData.map((s) => s.name), // Restricted to their zone if applicable
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

      const targetCol = worksheet.columns.find((c) => c.header === key);
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
    // 1. Fetch user to enforce Zone Security Rules
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userZoneId = user?.salesZoneId;

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
      [products, transporters, salesZones, packConfigs, customers] =
        await Promise.all([
          this.prisma.product.findMany(),
          this.prisma.transporter.findMany(),
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
        products.map((p: any) => [p.name.trim().toLowerCase(), p.id]),
      ),
      transporter: new Map<string, number>(
        transporters.map((t: any) => [t.name.trim().toLowerCase(), t.id]),
      ),
      salesZone: new Map<string, number>(
        salesZones.map((sz: any) => [sz.name.trim().toLowerCase(), sz.id]),
      ),
      packConfig: new Map<string, number>(
        packConfigs.map((pc: any) => [
          pc.configName.trim().toLowerCase(),
          pc.id,
        ]),
      ),
      customer: new Map<string, { id: number; address: string }>(
        customers.map((c: any) => [
          c.name.trim().toLowerCase(),
          { id: c.id, address: c.address },
        ]),
      ),
    };

    const ordersToUpsert: any[] = [];
    const errors: { row: number; errors: string[] }[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      let [
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

      const extractText = (cellValue: any): string => {
        if (cellValue === null || cellValue === undefined) return '';
        if (typeof cellValue === 'object') {
          if (cellValue instanceof Date) {
            return cellValue.toISOString();
          }

          if ('formula' in cellValue || cellValue.result !== undefined) {
            const res = cellValue.result;
            if (res && typeof res === 'object') {
              if (res.error) return String(res.error);
              if (res.richText && Array.isArray(res.richText)) {
                return res.richText.map((rt: any) => rt.text || '').join('');
              }
              if (res.text) {
                return typeof res.text === 'object' && res.text.richText
                  ? res.text.richText.map((rt: any) => rt.text || '').join('')
                  : String(res.text);
              }
              return '';
            }
            return res !== undefined && res !== null ? String(res) : '';
          }

          if (cellValue.richText && Array.isArray(cellValue.richText)) {
            return cellValue.richText.map((rt: any) => rt.text || '').join('');
          }

          if (cellValue.text) {
            if (
              typeof cellValue.text === 'object' &&
              cellValue.text.richText &&
              Array.isArray(cellValue.text.richText)
            ) {
              return cellValue.text.richText
                .map((rt: any) => rt.text || '')
                .join('');
            }
            return typeof cellValue.text === 'object'
              ? ''
              : String(cellValue.text);
          }

          return '';
        }

        return String(cellValue);
      };

      const normalizeDeliveryDateForDb = (value: any): Date | null => {
        if (!value) return null;

        if (value instanceof Date) {
          return new Date(
            Date.UTC(
              value.getFullYear(),
              value.getMonth(),
              value.getDate(),
              0,
              0,
              0,
              0,
            ),
          );
        }

        const raw = extractText(value).trim();
        if (!raw) return null;

        const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

        if (ymdMatch) {
          return parseYmdDateOnly(raw) ?? null;
        }

        const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);

        if (dmyMatch) {
          const d = Number(dmyMatch[1]);
          const m = Number(dmyMatch[2]);
          const y = Number(dmyMatch[3]);

          return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        }

        const fallback = new Date(raw);

        if (Number.isNaN(fallback.getTime())) {
          return null;
        }

        return new Date(
          Date.UTC(
            fallback.getFullYear(),
            fallback.getMonth(),
            fallback.getDate(),
            0,
            0,
            0,
            0,
          ),
        );
      };

      saleOrderNumber = extractText(saleOrderNumber);
      outboundDelivery = extractText(outboundDelivery);
      transferOrder = extractText(transferOrder);
      plantCode = extractText(plantCode);

      const rowErrors: string[] = [];

      let productNameRaw = extractText(product).trim();
      if (!productNameRaw) productNameRaw = 'FA';

      const transporterNameRaw = extractText(transporter).trim();
      const rawPlantCode = plantCode.trim();
      const plantCodeString = rawPlantCode === '' ? null : rawPlantCode;

      const salesZoneNameRaw = extractText(salesZone).trim().toLowerCase();
      let salesZoneId: number | null = null;
      if (salesZoneNameRaw) {
        const foundId = maps.salesZone.get(salesZoneNameRaw);
        if (foundId) {
          salesZoneId = foundId;
        } else {
          rowErrors.push(`Invalid salesZone: ${salesZoneNameRaw}`);
        }
      }

      if (userZoneId) {
        if (salesZoneId && salesZoneId !== userZoneId) {
          rowErrors.push(
            `Access Denied: You cannot import/assign orders to a different zone.`,
          );
        }
      }

      const packConfigName = extractText(packConfig).trim();
      let packConfigId: number | null = null;
      if (packConfigName) {
        const foundId = maps.packConfig.get(packConfigName.toLowerCase());
        if (foundId) {
          packConfigId = foundId;
        } else {
          rowErrors.push(`Invalid packConfig: ${packConfigName}`);
        }
      }

      const customerNameRaw = extractText(customer).trim();
      let customerId: number | null = null;
      let customerAddress: string | null = null;
      if (customerNameRaw) {
        const customerData = maps.customer.get(customerNameRaw.toLowerCase());
        if (customerData) {
          customerId = customerData.id;
          customerAddress = customerData.address;
        }
      }

      if (!saleOrderNumber) rowErrors.push('Missing saleOrderNumber');
      else if (saleOrderNumber.toString().trim().length < 10)
        rowErrors.push('Sale Order Number must be at least 10 characters');

      let paymentClearanceProvided = false;
      let paymentClearanceVal = false;
      if (
        paymentClearance !== undefined &&
        paymentClearance !== null &&
        paymentClearance !== ''
      ) {
        paymentClearanceProvided = true;
        if (
          !['Yes', 'No', true, false, 'yes', 'no'].includes(
            paymentClearance.toString(),
          )
        ) {
          rowErrors.push('Invalid paymentClearance (must be Yes or No)');
        } else {
          paymentClearanceVal =
            paymentClearance.toString().toLowerCase() === 'yes' ||
            paymentClearance === true;
        }
      }

      let deliveryDateObj: Date | null = null;

      if (deliveryDate) {
        deliveryDateObj = normalizeDeliveryDateForDb(deliveryDate);

        if (!deliveryDateObj) {
          rowErrors.push('Invalid deliveryDate format');
        }
      }

      if (rowErrors.length) {
        errors.push({ row: rowNumber, errors: rowErrors });
      } else {
        ordersToUpsert.push({
          rowNumber,
          productName: productNameRaw,
          saleOrderNumber: saleOrderNumber.trim(),
          outboundDelivery: outboundDelivery ? outboundDelivery.trim() : '',
          transferOrder: transferOrder ? transferOrder.trim() : null,
          plantCode: plantCodeString,
          packConfigId: packConfigId,
          deliveryDate: deliveryDateObj,
          transporterName: transporterNameRaw,
          paymentClearanceProvided,
          paymentClearance: paymentClearanceVal,
          salesZoneId,
          customerId,
          customerName: customerNameRaw,
          specialRemarks: extractText(specialRemarks) || null,
          additionalRemarks: extractText(additionalRemarks) || null,
          labelRemarks: extractText(labelRemarks) || null,
          address: customerAddress,
          userId,
        });
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message:
          'Import failed due to errors in the file. No orders were processed.',
        errors,
      });
    }

    if (ordersToUpsert.length === 0) {
      throw new BadRequestException({
        message: 'No valid orders found to process.',
      });
    }

    const soObdPairs = ordersToUpsert.map(
      (o) => `${o.saleOrderNumber}_${o.outboundDelivery}`,
    );
    const hasDuplicates = (arr: string[]) => new Set(arr).size !== arr.length;

    if (hasDuplicates(soObdPairs)) {
      throw new BadRequestException(
        'The import file contains identical Sale Order + Outbound Delivery combinations.',
      );
    }

    const existingOrders = await this.prisma.salesOrder.findMany({
      where: {
        OR: ordersToUpsert.map((o) => ({
          saleOrderNumber: o.saleOrderNumber,
          ...(o.outboundDelivery
            ? { outboundDelivery: o.outboundDelivery }
            : {}),
        })),
      },
    });

    const existingMap = new Map();
    const existingMapBySo = new Map();

    existingOrders.forEach((o) => {
      existingMap.set(`${o.saleOrderNumber}_${o.outboundDelivery || ''}`, o);

      if (!existingMapBySo.has(o.saleOrderNumber)) {
        existingMapBySo.set(o.saleOrderNumber, [o]);
      } else {
        existingMapBySo.get(o.saleOrderNumber).push(o);
      }
    });

    try {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const result = await this.prisma.$transaction(async (tx) => {
        let insertedCount = 0;
        let updatedCount = 0;

        for (const orderData of ordersToUpsert) {
          let finalProductId: number | null = null;
          let foundProdId = maps.product.get(
            orderData.productName.toLowerCase(),
          );
          if (!foundProdId) {
            const newProduct = await tx.product.create({
              data: { name: orderData.productName },
            });
            foundProdId = newProduct.id;
            maps.product.set(orderData.productName.toLowerCase(), foundProdId);
          }
          finalProductId = foundProdId;

          let finalCustomerId = orderData.customerId;
          let finalCustomerAddress = orderData.address;
          if (!finalCustomerId && orderData.customerName) {
            let foundCust = maps.customer.get(
              orderData.customerName.toLowerCase(),
            );
            if (!foundCust) {
              const newCustomer = await tx.customer.create({
                data: { name: orderData.customerName },
              });
              foundCust = {
                id: newCustomer.id,
                address: newCustomer.address || '',
              };
              maps.customer.set(
                orderData.customerName.toLowerCase(),
                foundCust,
              );
            }
            finalCustomerId = foundCust.id;
            finalCustomerAddress = foundCust.address;
          }

          let finalTransporterId: number | null = null;
          if (orderData.transporterName) {
            let foundTransId = maps.transporter.get(
              orderData.transporterName.toLowerCase(),
            );
            if (!foundTransId) {
              const newTransporter = await tx.transporter.create({
                data: { name: orderData.transporterName },
              });
              foundTransId = newTransporter.id;
              maps.transporter.set(
                orderData.transporterName.toLowerCase(),
                foundTransId,
              );
            }
            finalTransporterId = foundTransId;
          }

          const {
            customerName,
            transporterName,
            productName,
            rowNumber,
            paymentClearanceProvided,
            ...dataToSave
          } = orderData;

          const compositeKey = `${orderData.saleOrderNumber}_${orderData.outboundDelivery}`;
          let existing = existingMap.get(compositeKey);

          if (!existing && !orderData.outboundDelivery) {
            const matches = existingMapBySo.get(orderData.saleOrderNumber);
            if (matches && matches.length === 1) {
              existing = matches[0];
            } else if (matches && matches.length > 1) {
              throw new BadRequestException(
                `Multiple orders found for Sale Order ${orderData.saleOrderNumber}. Please provide Outbound Delivery to update the correct one.`,
              );
            }
          }

          if (existing) {
            if (userZoneId && existing.salesZoneId !== userZoneId) {
              throw new ConflictException(
                `Row ${orderData.rowNumber}: Order ${existing.saleOrderNumber} belongs to a different zone. You do not have permission to modify it.`,
              );
            }

            if (
              orderData.salesZoneId &&
              orderData.salesZoneId !== existing.salesZoneId
            ) {
              throw new ConflictException(
                `Row ${orderData.rowNumber}: Sales Zone cannot be changed for existing order ${existing.saleOrderNumber}.`,
              );
            }

            const updatePayload: any = {};

            if (finalProductId) updatePayload.productId = finalProductId;
            if (finalCustomerId) updatePayload.customerId = finalCustomerId;
            if (finalCustomerAddress)
              updatePayload.address = finalCustomerAddress;
            if (finalTransporterId)
              updatePayload.transporterId = finalTransporterId;
            if (orderData.plantCode)
              updatePayload.plantCode = orderData.plantCode;
            if (orderData.packConfigId)
              updatePayload.packConfigId = orderData.packConfigId;
            if (orderData.deliveryDate)
              updatePayload.deliveryDate = orderData.deliveryDate;
            if (orderData.specialRemarks)
              updatePayload.specialRemarks = orderData.specialRemarks;
            if (orderData.additionalRemarks)
              updatePayload.additionalRemarks = orderData.additionalRemarks;
            if (orderData.labelRemarks)
              updatePayload.labelRemarks = orderData.labelRemarks;
            if (orderData.transferOrder)
              updatePayload.transferOrder = orderData.transferOrder;
            if (orderData.outboundDelivery)
              updatePayload.outboundDelivery = orderData.outboundDelivery;
            if (paymentClearanceProvided)
              updatePayload.paymentClearance = orderData.paymentClearance;

            await tx.salesOrder.update({
              where: { id: existing.id },
              data: updatePayload,
            });
            updatedCount++;
          } else {
            if (userZoneId && !orderData.salesZoneId) {
              orderData.salesZoneId = userZoneId;
            }
            const missingForNew: string[] = [];
            if (!orderData.outboundDelivery)
              missingForNew.push('Outbound Delivery');
            if (!orderData.deliveryDate) missingForNew.push('Delivery Date');
            if (!finalTransporterId) missingForNew.push('Transporter');
            if (!finalCustomerId) missingForNew.push('Customer');
            if (!orderData.salesZoneId) missingForNew.push('Sales Zone');

            if (missingForNew.length > 0) {
              throw new BadRequestException(
                `Row ${orderData.rowNumber} (Sale Order: ${orderData.saleOrderNumber}) is treated as a NEW order but is missing mandatory fields: ${missingForNew.join(', ')}`,
              );
            }

            if (
              orderData.outboundDelivery &&
              !/^\d+$/.test(String(orderData.outboundDelivery).trim())
            ) {
              throw new BadRequestException(
                `Row ${orderData.rowNumber}: Outbound Delivery must contain only numbers. You cannot create a new order with an alphanumeric OBD (Found: '${orderData.outboundDelivery}').`,
              );
            }

            const newOrder = await tx.salesOrder.create({
              data: {
                ...dataToSave,
                salesZoneId: orderData.salesZoneId,
                productId: finalProductId,
                customerId: finalCustomerId,
                transporterId: finalTransporterId,
                address: finalCustomerAddress,
              },
            });

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
                salesOrderId: newOrder.id,
                status: status,
                createdDateTime:
                  status === 'To be Issued' ? newOrder.createdAt : null,
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
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const target = (err.meta?.target as string[])?.join(', ');
        throw new ConflictException(
          `Database error: A constraint failed. The value for '${target}' must be unique.`,
        );
      }
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Database operation failed',
        err.message,
      );
    }
  }

  async resetSalesOrder(id: number, username: string) {
    const so = await this.prisma.salesOrder.findUnique({
      where: { id },
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        createdAt: true,
      },
    });

    if (!so) {
      throw new NotFoundException(`Sales Order with ID ${id} not found`);
    }

    const now = new Date();

    const erpImportLogKeys = [
      so.saleOrderNumber,
      so.outboundDelivery
        ? `${so.saleOrderNumber}_${so.outboundDelivery}`
        : null,
    ].filter((value): value is string => Boolean(value));

    return this.prisma.$transaction(async (tx) => {
      await tx.eRP_Material_Data.deleteMany({
        where: { salesOrderId: id },
      });

      await tx.eRP_Data_Cron_Logs.deleteMany({
        where: {
          saleOrderNumber: {
            in: erpImportLogKeys,
            mode: 'insensitive',
          },
        },
      });

      await tx.sO_Status_Stepper.updateMany({
        where: {
          salesOrderId: id,
          status: {
            in: [
              'Under Issue',
              'Issued',
              'Under Packing',
              'Packed',
              'WIP Storage',
              'Ready for Dispatch',
              'Dispatched',
            ],
          },
        },
        data: {
          createdDateTime: null,
          updatedBy: username,
        },
      });

      await tx.sO_Status_Stepper.upsert({
        where: {
          salesOrderId_status: {
            salesOrderId: id,
            status: 'To be Issued',
          },
        },
        update: {
          createdDateTime: so.createdAt ?? now,
          updatedBy: username,
        },
        create: {
          salesOrderId: id,
          salesOrderNumber: so.saleOrderNumber,
          status: 'To be Issued',
          createdDateTime: so.createdAt ?? now,
          updatedBy: username,
        },
      });

      const updatedSo = await tx.salesOrder.update({
        where: { id },
        data: {
          status: null,
          priority: null,
          assignedUserId: null,
          issueAssignedUserId: null,
          packingAssignedUserId: null,
          isErpImported: 0,
          binCount: 0,
          skipStage: false,
          UpdatedBy: username,
          UpdatedDate: now,
        },
      });

      return {
        message: 'Sales Order has been reset successfully.',
        data: updatedSo,
      };
    });
  }
}
