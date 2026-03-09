import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
import { Prisma } from '@prisma/client';
import { LabelPrintDto } from './dto/label-print.dto';
import * as net from 'net';
import { PrintLabelDto } from './dto/print-label.dto';

@Injectable()
export class SalesCrudService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSalesCrudDto, userId: number) {
    const saleOrderNumber = dto.saleOrderNumber?.trim();
    const outboundDelivery = dto.outboundDelivery?.trim();
    const transferOrder = dto.transferOrder?.trim();

    const or: any[] = [];
    if (saleOrderNumber) or.push({ saleOrderNumber });
    if (outboundDelivery) or.push({ outboundDelivery });
    if (transferOrder) or.push({ transferOrder }); // only if non-empty

    const existingOrder = or.length
      ? await this.prisma.salesOrder.findFirst({ where: { OR: or } })
      : null;

    if (existingOrder) {
      if (
        saleOrderNumber &&
        existingOrder.saleOrderNumber === saleOrderNumber
      ) {
        throw new ConflictException(
          'An order with this Sale Order Number already exists.',
        );
      }

      if (
        outboundDelivery &&
        existingOrder.outboundDelivery === outboundDelivery
      ) {
        throw new ConflictException(
          'An order with this Outbound Delivery number already exists.',
        );
      }

      if (transferOrder && existingOrder.transferOrder === transferOrder) {
        throw new ConflictException(
          'An order with this Transfer Order number already exists.',
        );
      }
    }

    try {
      let resolvedCustomerId: number | null = dto.customerId ?? null;
      let finalCustomerNameText: string | null =
        dto.customerName && dto.customerName.trim()
          ? dto.customerName.trim()
          : null;

      if (!resolvedCustomerId && finalCustomerNameText) {
        let existingCustomer = await this.prisma.customer.findFirst({
          where: { name: { equals: finalCustomerNameText, mode: 'insensitive' } },
        });

        if (!existingCustomer) {
          existingCustomer = await this.prisma.customer.create({
            data: { name: finalCustomerNameText },
          });
        }
        resolvedCustomerId = existingCustomer.id;
        finalCustomerNameText = existingCustomer.name; 
      } 
      else if (resolvedCustomerId) {
        const existingCustomer = await this.prisma.customer.findUnique({
          where: { id: resolvedCustomerId },
        });
        if (existingCustomer) {
          finalCustomerNameText = existingCustomer.name;
        }
      }

      const customer = resolvedCustomerId
        ? await this.prisma.customer.findUnique({
            where: { id: resolvedCustomerId },
          })
        : null;
      const address = customer?.address || null;

      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(`${dto.deliveryDate}T00:00:00.000Z`).toISOString()
          : dto.deliveryDate;

      const { customerName, customerId, ...rest } = dto as any;

      const cleanedRest = Object.fromEntries(
        Object.entries(rest).map(([k, v]) => {
          if (typeof v === 'string') {
            const t = v.trim();
            return [k, t === '' ? null : t];
          }
          return [k, v];
        }),
      ) as typeof rest;

      const newOrder = await this.prisma.salesOrder.create({
        data: {
          ...cleanedRest,
          deliveryDate,
          userId,
          assignedUserId: null,
          customerId: resolvedCustomerId,
          printerId: null,
          address: address,
        },
        include: { customer: true },
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
      await this.prisma.sO_Status_Stepper.createMany({
        data: statuses.map((status) => ({
          salesOrderNumber: newOrder.saleOrderNumber,
          status: status,
          createdDateTime:
            status === 'To be Issued' ? newOrder.createdAt : null,
          updatedBy: null,
        })),
      });

      return newOrder;
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to create sales order.',
        err.message,
      );
    }
  }

  async verifySoNumber(soNumber: string) {
    try {
      const order = await this.prisma.salesOrder.findFirst({
        where: {
          saleOrderNumber: {
            equals: soNumber,
            mode: 'insensitive',
          },
        },
        select: {
          saleOrderNumber: true,
          customerNameText: true,
          address: true,
          customer: {
            select: {
              name: true,
              contactNumber: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Invalid SO Number');
      }

      return {
        valid: true,
        saleOrderNumber: order.saleOrderNumber,
        customerName: order.customer?.name || order.customerNameText || '',
        contactNumber: order.customer?.contactNumber || null,
        address: order.address || '',
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to verify sales order.',
        (err as Error).message,
      );
    }
  }

  async findAll(userId: number, query: { search?: string }) {
    try {
      const { search } = query;
      const where: any = { userId };

      if (search) {
        const s = { contains: search, mode: 'insensitive' };
        where.OR = [
          { saleOrderNumber: s },
          { outboundDelivery: s },
          { transferOrder: s },
          { status: s },
          { specialRemarks: s },
          { labelRemarks: s },
          ...(['true', 'false'].includes(search.toLowerCase())
            ? [{ paymentClearance: search.toLowerCase() === 'true' }]
            : []),
          { customerNameText: s },
          { customer: { is: { name: s } } },
          { product: { is: { name: s } } },
          { transporter: { is: { name: s } } },
          { plantCode: s },
          { salesZone: { is: { name: s } } },
          { packConfig: { is: { configName: s } } },
        ];
      }

      return await this.prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          product: true,
          transporter: true,
          // plantCode: true,
          salesZone: true,
          packConfig: true,
        },
      });
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to fetch sales orders.',
        err.message,
      );
    }
  }

  async findOne(id: number, userId: number) {
    try {
      const order = await this.prisma.salesOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          product: true,
          transporter: true,
          // plantCode: true,
          salesZone: true,
          packConfig: true,
        },
      });
      if (!order || order.userId !== userId) {
        throw new NotFoundException('Sales order not found or access denied.');
      }
      return order;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        'Failed to retrieve sales order.',
        (err as Error).message,
      );
    }
  }

  async update(id: number, dto: UpdateSalesCrudDto, userId: number) {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    const restrictedStatuses = ['Packed', 'WIP Storage', 'Ready for Dispatch', 'Dispatched'];
    if (existing.status && restrictedStatuses.includes(existing.status)) {
      throw new ForbiddenException(`Cannot modify order. The packing stage is already completed (Current Status: ${existing.status}).`);
    }

    try {
      let resolvedCustomerId: number | undefined =
        dto.customerId ?? undefined;
      let finalCustomerNameText: string | undefined =
        (dto as any).customerName && String((dto as any).customerName).trim()
          ? String((dto as any).customerName).trim()
          : undefined;

      if (!resolvedCustomerId && finalCustomerNameText) {
        let existingCustomer = await this.prisma.customer.findFirst({
          where: { name: { equals: finalCustomerNameText, mode: 'insensitive' } },
        });

        if (!existingCustomer) {
          existingCustomer = await this.prisma.customer.create({
            data: { name: finalCustomerNameText },
          });
        }
        resolvedCustomerId = existingCustomer.id;
        finalCustomerNameText = existingCustomer.name;
      } 
      else if (resolvedCustomerId) {
        const existingCustomer = await this.prisma.customer.findUnique({
          where: { id: resolvedCustomerId },
        });
        if (existingCustomer) {
          finalCustomerNameText = existingCustomer.name;
        }
      }

      let address: string | null | undefined;
      if (resolvedCustomerId) {
        const customer = await this.prisma.customer.findUnique({
          where: { id: resolvedCustomerId },
        });
        if (customer) address = customer.address;
      }

      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(`${dto.deliveryDate}T00:00:00.000Z`).toISOString()
          : dto.deliveryDate;

      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      const { customerName, customerId, ...rest } = dto as any;

      return await this.prisma.salesOrder.update({
        where: { id },
        data: {
          ...rest,
          ...(deliveryDate ? { deliveryDate } : {}),
          UpdatedBy: user?.name || 'System',
          UpdatedDate: new Date(),
          ...(resolvedCustomerId !== undefined
            ? { customerId: resolvedCustomerId }
            : {}),
          ...(address !== undefined && { address }),
        },
        include: {
          customer: true,
          product: true,
          transporter: true,
          salesZone: true,
          packConfig: true,
        },
      });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          throw new NotFoundException('Sales order not found.');
        }
        if (err.code === 'P2002') {
          throw new ConflictException(
            'Update would violate a unique constraint.',
          );
        }
      }
      throw new InternalServerErrorException(
        'Failed to update sales order.',
        err.message,
      );
    }
  }

  async remove(id: number, userId: number) {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    try {
      await this.prisma.salesOrder.delete({ where: { id } });
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Sales order not found.');
      }
      throw new InternalServerErrorException(
        'Failed to delete sales order.',
        err.message,
      );
    }
  }

  async getPaginatedOrders(
    page: number,
    limit: number,
    userId: number,
    filters: {
      search?: string;
      paymentClearance?: string;
      salesZoneId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    try {
      const skip = (page - 1) * limit;
      const whereClause: any = { userId };

      // 1. APPLY INDIVIDUAL FILTERS
      if (filters.paymentClearance !== undefined) {
        whereClause.paymentClearance = filters.paymentClearance === 'true';
      }
      if (filters.salesZoneId) {
        whereClause.salesZoneId = parseInt(filters.salesZoneId, 10);
      }
      if (filters.status) {
        if (filters.status === 'None') {
          whereClause.AND = [
            ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
            { OR: [{ status: null }, { status: '' }] },
          ];
        } else {
          whereClause.status = filters.status;
        }
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
          const s = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
          range.gte = s;
        }

        if (filters.endDate) {
          const { y, m, d } = parseYMD(filters.endDate);
          const e = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);
          range.lt = e;
        }

        whereClause.deliveryDate = { ...(whereClause.deliveryDate as object), ...range };
      }

      // 2. APPLY SEARCH ACROSS ALL SPECIFIED COLUMNS
      if (filters.search) {
        const searchStr = filters.search.trim();
        const s = { contains: searchStr, mode: 'insensitive' };
        
        whereClause.OR = [
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

        // Handle Payment Clearance Search (Boolean mapping)
        const lowerSearch = searchStr.toLowerCase();
        if (['yes', 'true'].includes(lowerSearch)) {
          whereClause.OR.push({ paymentClearance: true });
        } else if (['no', 'false'].includes(lowerSearch)) {
          whereClause.OR.push({ paymentClearance: false });
        }
      }

      // 3. FETCH PAGINATED RESULTS AND COUNT
      const [orders, totalCount] = await this.prisma.$transaction([
        this.prisma.salesOrder.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: true,
            product: true,
            transporter: true,
            salesZone: true,
            packConfig: true,
            assignedUser: true,
            _count: {
              select: {
                materialData: true,
                soChatNotifications: { where: { userId } },
              },
            },
          },
        }),
        this.prisma.salesOrder.count({ where: whereClause }),
      ]);

      const mappedOrders = orders.map((order) => ({
        ...order,
        hasMaterialData: order._count.materialData > 0,
        notificationCount: order._count.soChatNotifications,
      }));

      return { orders: mappedOrders, totalCount };
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to fetch paginated sales orders.',
        err.message,
      );
    }
  }

  async processLabelPrint(dto: LabelPrintDto, userId: number) {
    const { saleOrderNumbers, cncText, boxNN } = dto;
    const statusToSet = 'Ready for Dispatch';

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'System';
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.salesOrder.updateMany({
          where: {
            saleOrderNumber: { in: saleOrderNumbers },
            status: { not: 'Dispatched' },
          },
          data: {
            UpdatedBy: userName,
            UpdatedDate: now,
          },
        });

        await tx.sO_Status_Stepper.updateMany({
          where: {
            salesOrderNumber: { in: saleOrderNumbers },
            status: statusToSet,
          },
          data: {
            createdDateTime: now,
            updatedBy: userName,
          },
        });

        await tx.customerLabelPrint.create({
          data: {
            userId: userId,
            userName: userName,
            cncText: cncText || 'CNC Package',
            boxNN: boxNN || '1/1',
            createdAt: now,
            entries: {
              create: saleOrderNumbers.map((soNumber) => ({
                saleOrderNumber: soNumber,
              })),
            },
          },
        });
      });

      return {
        message: 'Labels printed, status updated, and print history saved.',
        count: saleOrderNumbers.length,
      };
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to update order status for label print.',
        err.message,
      );
    }
  }

  async printOrderLabel(orderId: number, dto: PrintLabelDto) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: { customer: true, salesZone: true, printer: true },
    });

    if (!order) throw new NotFoundException('Sales Order not found');

    const printerId = dto.printerId ?? order.printerId;

    if (!printerId) {
      throw new InternalServerErrorException(
        'No printer provided and no printer assigned to this order.',
      );
    }

    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
    });

    if (!printer || !printer.name) {
      throw new InternalServerErrorException(
        'Printer name not configured.',
      );
    }

    const qty = dto.quantity || 1;
    const customerName = order.customerNameText || order.customer?.name || '';
    const labelRemarks = order.labelRemarks || '';
    const salesZone = order.salesZone?.name || '';

    const prnCommands = [
      'SIZE 60 mm, 30 mm',
      'GAP 3 mm, 0 mm',
      'DIRECTION 0,0',
      'REFERENCE 0,0',
      'OFFSET 0 mm',
      'SET PEEL OFF',
      'SET CUTTER OFF',
      'SET PARTIAL_CUTTER OFF',
      'SET TEAR ON',
      'CLS',
      'CODEPAGE 1252',
      `TEXT 460,265,"0",180,11,16,"${customerName}"`,
      `TEXT 460,208,"0",180,24,26,"${order.saleOrderNumber}"`,
      `TEXT 368,79,"0",180,12,14,"${labelRemarks}"`,
      `TEXT 460,79,"0",180,12,14,"${salesZone}"`,
      `QRCODE 111,127,L,4,A,180,M2,S7,"${order.saleOrderNumber}"`,
      `PRINT ${qty},1`,
      ''
    ];

    const finalPrn = prnCommands.join('\r\n');
    
    // return {
    //   success: true,
    //   message: 'Dry-run successful. Here is the payload:',
    //   payload: finalPrn
    // };

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(5000);

      client.connect(9100, printer.name, () => {
        client.write(finalPrn, () => {
          client.end();
          resolve({ success: true, message: 'Print job sent successfully' });
        });
      });

      client.on('error', (err) => {
        client.destroy();
        reject(
          new InternalServerErrorException(`Printer error: ${err.message}`),
        );
      });

      client.on('timeout', () => {
        client.destroy();
        reject(
          new InternalServerErrorException(
            `Printer error: Connection to ${printer.name}:9100 timed out after 5000ms. Verify the printer is online.`
          ),
        );
      });
    });
  }
}
