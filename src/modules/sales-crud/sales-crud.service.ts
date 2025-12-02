import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
import { Prisma } from '@prisma/client';
import { LabelPrintDto } from './dto/label-print.dto';

@Injectable()
export class SalesCrudService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSalesCrudDto, userId: number) {
    const existingOrder = await this.prisma.salesOrder.findFirst({
      where: {
        OR: [
          { saleOrderNumber: dto.saleOrderNumber },
          { outboundDelivery: dto.outboundDelivery },
          { transferOrder: dto.transferOrder },
        ],
      },
    });

    if (existingOrder) {
      if (existingOrder.saleOrderNumber === dto.saleOrderNumber) {
        throw new ConflictException(
          'An order with this Sale Order Number already exists.',
        );
      }
      if (existingOrder.outboundDelivery === dto.outboundDelivery) {
        throw new ConflictException(
          'An order with this Outbound Delivery number already exists.',
        );
      }
      if (existingOrder.transferOrder === dto.transferOrder) {
        throw new ConflictException(
          'An order with this Transfer Order number already exists.',
        );
      }
    }

    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      const address = customer?.address || null;

      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(dto.deliveryDate).toISOString()
          : dto.deliveryDate;

      const newOrder = await this.prisma.salesOrder.create({
        data: {
          ...dto,
          deliveryDate,
          userId,
          assignedUserId: null,
          customerId: dto.customerId,
          printerId: null,
          address: address,
        },
        include: { customer: true },
      });

      const statuses = [
        "To be Issued",
        "Under Issue",
        "Issued",
        "Under Packing",
        "Packed",
        "WIP Storage",
        "Ready for Dispatch", // RENAMED
        "Dispatched"
      ];
      await this.prisma.sO_Status_Stepper.createMany({
        data: statuses.map(status => ({
          salesOrderNumber: newOrder.saleOrderNumber,
          status: status,
          createdDateTime: status === 'To be Issued' ? newOrder.createdAt : null,
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
          address: true,
          customer: {
            select: {
              name: true,
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
        customerName: order.customer?.name || '',
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
          ...(['true', 'false'].includes(search.toLowerCase())
            ? [{ paymentClearance: search.toLowerCase() === 'true' }]
            : []),
          { customer: { is: { name: s } } },
          { product: { is: { name: s } } },
          { transporter: { is: { name: s } } },
          { plantCode: { is: { code: s } } },
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
          plantCode: true,
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
          plantCode: true,
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

    try {
      let address: string | undefined;
      if (dto.customerId) {
        const customer = await this.prisma.customer.findUnique({
          where: { id: dto.customerId },
        });
        if (customer) address = customer.address;
      }

      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(dto.deliveryDate).toISOString()
          : dto.deliveryDate;

      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      return await this.prisma.salesOrder.update({
        where: { id },
        data: {
          ...dto,
          deliveryDate,
          UpdatedBy: user?.name || 'System',
          UpdatedDate: new Date(),
          ...(address !== undefined && { address }),
        },
        include: {
          customer: true,
          product: true,
          transporter: true,
          plantCode: true,
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
    search?: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const whereClause: any = { userId };

      if (search) {
        const s = { contains: search, mode: 'insensitive' };
        whereClause.OR = [
          { saleOrderNumber: s },
          { outboundDelivery: s },
          { transferOrder: s },
          { status: s },
          { specialRemarks: s },
          ...(['true', 'false'].includes(search.toLowerCase())
            ? [{ paymentClearance: search.toLowerCase() === 'true' }]
            : []),
          { customer: { is: { name: s } } },
          { product: { is: { name: s } } },
          { transporter: { is: { name: s } } },
          { plantCode: { is: { code: s } } },
          { salesZone: { is: { name: s } } },
          { packConfig: { is: { configName: s } } },
        ];
      }

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
            plantCode: true,
            salesZone: true,
            packConfig: true,
            assignedUser: true,
            _count: { select: { materialData: true } },
          },
        }),
        this.prisma.salesOrder.count({ where: whereClause }),
      ]);

      const mappedOrders = orders.map((order) => ({
        ...order,
        hasMaterialData: order._count.materialData > 0,
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
    const { saleOrderNumbers } = dto;
    const statusToSet = 'Ready for Dispatch'; // RENAMED

    // Get the user name for the history log
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'System';
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Update the main SalesOrder status
        // We exclude orders that are already 'Dispatched' to prevent reverting status
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

        // 2. Update the Stepper history
        // We find the specific step "Ready for Dispatch" for these orders and mark it as done
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
      });

      return {
        message: 'Labels printed and status updated to Ready for Dispatch.',
        count: saleOrderNumbers.length,
      };
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to update order status for label print.',
        err.message,
      );
    }
  }
}