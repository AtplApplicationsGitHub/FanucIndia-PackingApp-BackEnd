import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateAdminOrderDto } from './dto/update-admin-order.dto';
import { BulkAssignOrderDto } from './dto/bulk-assign-order.dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AdminOrderService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any, user: { userId: number }) {
    const {
      page = 1,
      limit = 20,
      search,
      date,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      paymentClearance,
      salesZoneId,
      statusFilter,
    } = query;

    const parsedPage = Number(page) > 0 ? Number(page) : 1;
    const parsedLimit =
      Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;

    const allowedSortFields = [
      'createdAt',
      'priority',
      'status',
      'deliveryDate',
    ];
    const allowedSortOrders = ['asc', 'desc'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = allowedSortOrders.includes(sortOrder)
      ? sortOrder
      : 'desc';

    const where: Prisma.SalesOrderWhereInput = {};

    if (typeof paymentClearance === 'string' && paymentClearance !== '') {
      where.paymentClearance = paymentClearance === 'true';
    }

    if (typeof salesZoneId === 'string' && salesZoneId !== '') {
      const zoneIdNum = Number(salesZoneId);
      if (!Number.isNaN(zoneIdNum)) where.salesZoneId = zoneIdNum;
    }

    if (typeof statusFilter === 'string' && statusFilter !== '') {
      if (statusFilter === 'None') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          { OR: [{ status: null }, { status: '' }] },
        ];
      } else {
        where.status = statusFilter;
      }
    }

    const parseYMD = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return { y, m, d };
    };

    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    if (startDate || endDate) {
      const range: { gte?: Date; lt?: Date } = {};

      if (startDate) {
        const { y, m, d } = parseYMD(startDate);
        const s = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
        range.gte = s;
      }

      if (endDate) {
        const { y, m, d } = parseYMD(endDate);
        const e = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);
        range.lt = e;
      }

      where.deliveryDate = { ...(where.deliveryDate as object), ...range };
    }

    if (search) {
      const lower = search.toLowerCase();
      const num = Number(search);

      where.OR = [
        {
          customer: { is: { name: { contains: search, mode: 'insensitive' } } },
        },
        { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
        {
          product: { is: { name: { contains: search, mode: 'insensitive' } } },
        },
        {
          transporter: {
            is: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          plantCode: { contains: search, mode: 'insensitive' },
        },
        {
          salesZone: {
            is: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          packConfig: {
            is: { configName: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          assignedUser: {
            is: { name: { contains: search, mode: 'insensitive' } },
          },
        },

        { saleOrderNumber: { contains: search, mode: 'insensitive' } },
        { outboundDelivery: { contains: search, mode: 'insensitive' } },
        { transferOrder: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { specialRemarks: { contains: search, mode: 'insensitive' } },
        { labelRemarks: { contains: search, mode: 'insensitive' } },

        ...(lower === 'yes' || lower === 'no'
          ? [{ paymentClearance: { equals: lower === 'yes' } }]
          : []),
        ...(!isNaN(num) ? [{ priority: { equals: num } }] : []),
      ];
    }

    if (date) {
      const [y, m, d] = date.split('-').map(Number);

      const startUtc = new Date(
        Date.UTC(y, m - 1, d, 0, 0, 0) - 5.5 * 60 * 60 * 1000,
      );
      const endUtc = new Date(
        Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000,
      );
      where.deliveryDate = { gte: startUtc, lte: endUtc };
    }

    try {
      const total = await this.prisma.salesOrder.count({ where });
      if (total === 0) {
        return { total: 0, page: 1, limit: 0, data: [] };
      }

      const isFilterActive = !!search || !!startDate || !!endDate;
      const skip = isFilterActive ? 0 : (parsedPage - 1) * parsedLimit;
      const take = isFilterActive ? total : parsedLimit;

      const data = await this.prisma.salesOrder.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, email: true } },
          // UPDATED: Removed "code: true"
          product: { select: { id: true, name: true } },
          transporter: { select: { id: true, name: true } },
          // plantCode: { select: { id: true, code: true, description: true } },
          salesZone: { select: { id: true, name: true } },
          packConfig: { select: { id: true, configName: true } },
          assignedUser: { select: { id: true, name: true } },
          _count: {
            select: {
              materialData: true,
              soChatNotifications: { where: { userId: user.userId } },
            },
          },
        },
      });

      return {
        total,
        page: isFilterActive ? 1 : parsedPage,
        limit: isFilterActive ? total : parsedLimit,
        data: data.map(({ _count, ...order }) => ({
          ...order,
          hasMaterialData: order.isErpImported === 1,
          notificationCount: _count.soChatNotifications,
        })),
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(err.message);
      }
      throw new BadRequestException('Failed to fetch sales orders.');
    }
  }

  async update(
    id: number,
    dto: UpdateAdminOrderDto,
    user: { userId: number; role: string; name: string },
  ) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (user.role === 'USER' && order.assignedUserId !== user.userId) {
      throw new ForbiddenException(
        'You can only update orders assigned to you.',
      );
    }

    if (user.role === 'USER') {
      if (Object.keys(dto).length > 1 || !('fgLocation' in dto)) {
        throw new ForbiddenException(
          'You are only allowed to update the FG Location.',
        );
      }
    }

    let addressToSave: string | null | undefined = dto.address;

    if (addressToSave === undefined && dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (customer) addressToSave = customer.address;
    }

    if (dto.deliveryDate && dto.deliveryDate.length === 10) {
      dto.deliveryDate = new Date(
        `${dto.deliveryDate}T00:00:00.000Z`,
      ).toISOString();
    }

    const { customerId, customerNameText, ...rest } = dto;

    if (rest.priority === null) {
      delete rest.priority;
    }

    const data: Prisma.SalesOrderUncheckedUpdateInput = {
      ...rest,
      UpdatedBy: user.name,
      UpdatedDate: new Date(),
      ...(addressToSave !== undefined && { address: addressToSave }),
    };

    if (customerNameText !== undefined && customerNameText !== null) {
      data.customerNameText = customerNameText;
      data.customerId = null;
    } else if (customerId !== undefined && customerId !== null) {
      data.customerId = customerId;
      data.customerNameText = null;
    }

    if (
      dto.priority !== undefined &&
      dto.priority !== null &&
      order.status === null
    ) {
      data.status = 'R105';
    }

    const now = new Date();

    if (dto.assignedUserId && order.assignedUserId !== dto.assignedUserId) {
      let targetStatus = '';

      if (order.status === 'R105' || !order.status) {
        targetStatus = 'Under Issue';
      } else if (order.status === 'W105') {
        targetStatus = 'Under Packing';
      }

      if (targetStatus) {
        await this.prisma.sO_Status_Stepper.updateMany({
          where: {
            salesOrderNumber: order.saleOrderNumber,
            status: targetStatus,
            createdDateTime: null,
          },
          data: {
            createdDateTime: now,
            updatedBy: user.name,
          },
        });
      }
    }

    if (dto.fgLocation && order.fgLocation !== dto.fgLocation) {
      await this.prisma.sO_Status_Stepper.updateMany({
        where: {
          salesOrderNumber: order.saleOrderNumber,
          status: 'WIP Storage',
        },
        data: {
          createdDateTime: now,
          updatedBy: user.name,
        },
      });
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        _count: {
          select: { materialData: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    if (order._count.materialData > 0) {
      throw new BadRequestException(
        'Cannot delete an order that has material data imported.',
      );
    }

    await this.prisma.salesOrder.delete({ where: { id } });
    return { message: 'Sales order deleted successfully' };
  }

  async bulkAssign(
    dto: BulkAssignOrderDto,
    user: { userId: number; name: string },
  ) {
    const { salesOrderIds, assignedUserId } = dto;
    const now = new Date();

    const orders = await this.prisma.salesOrder.findMany({
      where: { id: { in: salesOrderIds } },
      select: {
        id: true,
        status: true,
        saleOrderNumber: true,
        assignedUserId: true,
      },
    });

    if (orders.length === 0) {
      throw new NotFoundException('No valid orders found for the provided IDs');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const order of orders) {
        if (order.assignedUserId === assignedUserId) continue;

        let targetStatus = '';
        if (order.status === 'R105' || !order.status) {
          targetStatus = 'Under Issue';
        } else if (order.status === 'W105') {
          targetStatus = 'Under Packing';
        }

        if (targetStatus) {
          await tx.sO_Status_Stepper.updateMany({
            where: {
              salesOrderNumber: order.saleOrderNumber,
              status: targetStatus,
              createdDateTime: null,
            },
            data: {
              createdDateTime: now,
              updatedBy: user.name,
            },
          });
        }

        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            assignedUserId: assignedUserId,
            UpdatedBy: user.name,
            UpdatedDate: now,
          },
        });
      }
    });

    return { message: 'Bulk assignment successful', count: orders.length };
  }

  async fetchActiveOrders() {
    const data = await this.prisma.salesOrder.findMany({
      where: {
        OR: [{ status: null }, { status: 'R105' }, { status: 'W105' }],
      },
      select: {
        saleOrderNumber: true,
        outboundDelivery: true,
        transferOrder: true,
        deliveryDate: true,
        paymentClearance: true,
        status: true,
        priority: true,

        user: {
          select: { name: true },
        },
        product: {
          select: { name: true },
        },
        salesZone: {
          select: { name: true },
        },
        assignedUser: {
          select: { name: true },
        },
        customer: {
          select: { name: true },
        },
        customerNameText: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return data.map((order) => ({
      userName: order.user?.name,
      product: order.product?.name,
      saleOrderNumber: order.saleOrderNumber,
      outboundDelivery: order.outboundDelivery,
      transferOrder: order.transferOrder,
      requiredDate: order.deliveryDate,
      payment: order.paymentClearance,
      salesZone: order.salesZone?.name,
      customer: order.customer?.name || order.customerNameText,
      status: order.status,
      priority: order.priority,
      assignedUser: order.assignedUser?.name,
    }));
  }

  async bulkUpdateSkipIssue(dto: {
    salesOrderIds: number[];
    skipIssueStage: boolean;
  }) {
    const { salesOrderIds, skipIssueStage } = dto;

    const orders = await this.prisma.salesOrder.findMany({
      where: { id: { in: salesOrderIds } },
      select: { id: true, saleOrderNumber: true, isErpImported: true },
    });

    if (orders.length === 0) {
      throw new NotFoundException('No valid orders found for the provided IDs');
    }

    const validOrderIds: number[] = [];
    const invalidOrderNumbers: string[] = [];

    for (const order of orders) {
      if (order.isErpImported === 1) {
        validOrderIds.push(order.id);
      } else {
        invalidOrderNumbers.push(order.saleOrderNumber);
      }
    }

    if (validOrderIds.length > 0) {
      await this.prisma.salesOrder.updateMany({
        where: { id: { in: validOrderIds } },
        data: { skipIssueStage },
      });
    }

    let message = `Successfully updated skip issue stage for ${validOrderIds.length} order(s).`;

    if (invalidOrderNumbers.length > 0) {
      message += ` Could not update the following orders because ERP Material Data has not been imported yet: ${invalidOrderNumbers.join(', ')}.`;
    }

    return {
      message,
      updatedCount: validOrderIds.length,
      skippedCount: invalidOrderNumbers.length,
      skippedOrders: invalidOrderNumbers,
    };
  }

  async processExcelImport(fileBuffer: Buffer, user: any) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) throw new BadRequestException('Invalid Excel file');

    // Safely map headers to their column indexes (ExcelJS columns are 1-based)
    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        colMap[cell.value.toString().trim().toUpperCase()] = colNumber;
      }
    });

    if (!colMap['SALE ORDER NUMBER']) {
      throw new BadRequestException(
        'Invalid File Format. Missing "SALE ORDER NUMBER" column.',
      );
    }

    // Start transaction for atomic updates
    return this.prisma.$transaction(async (tx) => {
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);

        const saleOrderNumberCell = row.getCell(colMap['SALE ORDER NUMBER']);
        const saleOrderNumber = saleOrderNumberCell.value?.toString().trim();

        if (!saleOrderNumber) continue;

        const dbOrder = await tx.salesOrder.findUnique({
          where: { saleOrderNumber },
          include: {
            product: true,
            transporter: true,
            packConfig: true,
            customer: true,
            salesZone: true,
          },
        });

        if (!dbOrder) {
          throw new BadRequestException(
            `Row ${i}: Invalid SO. Sale Order Number '${saleOrderNumber}' does not exist in the database. Adding new Orders via Excel upload is not allowed.`
          );
        }

        // Helper function to safely get string values from row
        const getCellString = (colName: string) => {
          if (!colMap[colName]) return undefined;
          const val = row.getCell(colMap[colName]).value;
          return val ? val.toString().trim() : undefined;
        };

        // ----------------------------------------------------
        // 1. VALIDATE READ-ONLY COLUMNS (Ensure no tampering)
        // ----------------------------------------------------
        const rowProduct = getCellString('PRODUCT');
        if (rowProduct && rowProduct !== (dbOrder.product?.name || '')) {
          throw new BadRequestException(
            `Row ${i}: Modifying read-only column 'PRODUCT' is not allowed.`,
          );
        }

        const rowOBD = getCellString('OUT BOUND DELIVERY');
        if (rowOBD && rowOBD !== (dbOrder.outboundDelivery || '')) {
          throw new BadRequestException(
            `Row ${i}: Modifying read-only column 'OUT BOUND DELIVERY' is not allowed.`,
          );
        }

        const rowTO = getCellString('TRANSFER ORDER');
        if (rowTO && rowTO !== (dbOrder.transferOrder || '')) {
          throw new BadRequestException(
            `Row ${i}: Modifying read-only column 'TRANSFER ORDER' is not allowed.`,
          );
        }

        const rowSalesZone = getCellString('SALES ZONE');
        if (rowSalesZone && rowSalesZone !== (dbOrder.salesZone?.name || '')) {
          throw new BadRequestException(
            `Row ${i}: Modifying read-only column 'SALES ZONE' is not allowed.`,
          );
        }

        const dbCustomerName =
          dbOrder.customer?.name || dbOrder.customerNameText || '';
        const rowCustomer = getCellString('CUSTOMER');
        if (rowCustomer && rowCustomer !== dbCustomerName) {
          throw new BadRequestException(
            `Row ${i}: Modifying read-only column 'CUSTOMER' is not allowed.`,
          );
        }

        // ----------------------------------------------------
        // 2. RESOLVE MASTER TABLE ADDITIONS / DROPDOWNS
        // ----------------------------------------------------

        // Transporter
        let transporterId = dbOrder.transporterId;
        const rowTransporter = getCellString('TRANSPORTER');
        if (
          rowTransporter &&
          rowTransporter !== '' &&
          rowTransporter !== (dbOrder.transporter?.name || '')
        ) {
          let t = await tx.transporter.findFirst({
            where: { name: rowTransporter },
          });
          if (!t) {
            t = await tx.transporter.create({ data: { name: rowTransporter } });
          }
          transporterId = t.id;
        }

        // Pack Config
        let packConfigId = dbOrder.packConfigId;
        const rowPackConfig = getCellString('PACKING CONFIG');
        if (
          rowPackConfig &&
          rowPackConfig !== '' &&
          rowPackConfig !== (dbOrder.packConfig?.configName || '')
        ) {
          let p = await tx.packConfig.findFirst({
            where: { configName: rowPackConfig },
          });
          if (!p) {
            p = await tx.packConfig.create({
              data: { configName: rowPackConfig },
            });
          }
          packConfigId = p.id;
        }

        // Assigned User
        let assignedUserId = dbOrder.assignedUserId;
        const rowAssignedUser = getCellString('ASSIGNED USER');
        if (
          rowAssignedUser &&
          rowAssignedUser !== '' &&
          rowAssignedUser !== 'Unassigned'
        ) {
          const u = await tx.user.findFirst({
            where: { name: rowAssignedUser, role: 'USER' },
          });
          if (u) assignedUserId = u.id;
        }

        // ----------------------------------------------------
        // 3. PARSE FORMATTED DATA (Date, Boolean, Number)
        // ----------------------------------------------------

        // Payment Clearance
        const rowPayment = getCellString('PAYMENT CLEARANCE');
        let paymentClearance = dbOrder.paymentClearance;
        if (rowPayment) paymentClearance = rowPayment.toLowerCase() === 'yes';

        // Priority
        let priority = dbOrder.priority;
        const rowPriority = getCellString('PRIORITY');
        if (rowPriority && rowPriority !== '') {
          const p = parseInt(rowPriority, 10);
          if (!isNaN(p)) priority = p;
        }

        // Delivery Date
        let deliveryDate = dbOrder.deliveryDate;
        const deliveryDateCell = colMap['DELIVERY DATE']
          ? row.getCell(colMap['DELIVERY DATE']).value
          : undefined;
        if (deliveryDateCell) {
          if (deliveryDateCell instanceof Date) {
            deliveryDate = deliveryDateCell;
          } else {
            // If it's a string from excel, parse it safely
            const parsedDate = new Date(deliveryDateCell.toString());
            if (!isNaN(parsedDate.getTime())) {
              deliveryDate = parsedDate;
            }
          }
        }

        const safeString = (val: string | undefined, fallback: any) =>
          (val !== undefined && val !== "") ? val : fallback;

        await tx.salesOrder.update({
          where: { id: dbOrder.id },
          data: {
            transporterId,
            packConfigId,
            assignedUserId,
            paymentClearance,
            priority,
            deliveryDate,
            plantCode: safeString(
              getCellString('PLANT CODE'),
              dbOrder.plantCode,
            ),
            specialRemarks: safeString(
              getCellString('SPECIAL REMARKS'),
              dbOrder.specialRemarks,
            ),
            additionalRemarks: safeString(
              getCellString('ADDITIONAL REMARKS'),
              (dbOrder as any).additionalRemarks,
            ),
            labelRemarks: safeString(
              getCellString('LABEL REMARKS'),
              dbOrder.labelRemarks,
            ),
            UpdatedBy: user.name,
            UpdatedDate: new Date(),
          },
        });
      }

      return { message: 'Excel import processed successfully' };
    });
  }
}