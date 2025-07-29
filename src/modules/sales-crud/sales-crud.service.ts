// src/sales-crud/sales-crud.service.ts

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';

@Injectable()
export class SalesCrudService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSalesCrudDto, userId: number) {
    try {
      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(dto.deliveryDate).toISOString()
          : dto.deliveryDate;

      return await this.prisma.salesOrder.create({
        data: {
          ...dto,
          deliveryDate,
          userId,
          status: 'R105',
          terminalId: null,
          customerId: dto.customerId,
          printerId: null,
        },
        include: { customer: true },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Failed to create sales order',
        error.message,
      );
    }
  }

  /**
   * Fetch all sales orders for a given user,
   * optionally filtering by multiple fields via `?search=…`
   */
  async findAll(userId: number, query: { search?: string }) {
    try {
      const { search } = query;
      const where: any = { userId };

      if (search) {
        where.OR = [
          // Sales Order No
          { saleOrderNumber: { contains: search } },

          // OB Delivery
          { outboundDelivery: { contains: search } },

          // Transfer Order
          { transferOrder: { contains: search } },

          // Status
          { status: { contains: search } },

          // Remarks
          { specialRemarks: { contains: search } },

          // Boolean paymentClearance (match "true" or "false")
          ...(search.toLowerCase() === 'true' ||
          search.toLowerCase() === 'false'
            ? [{ paymentClearance: search.toLowerCase() === 'true' }]
            : []),

          // Related customer name
          {
            customer: {
              is: { name: { contains: search } },
            },
          },

          // Related product name
          {
            product: {
              is: { name: { contains: search } },
            },
          },

          // Related transporter name
          {
            transporter: {
              is: { name: { contains: search } },
            },
          },

          // Related plant code
          {
            plantCode: {
              is: { code: { contains: search } },
            },
          },

          // Related sales zone
          {
            salesZone: {
              is: { name: { contains: search } },
            },
          },

          // Related pack config
          {
            packConfig: {
              is: { configName: { contains: search } },
            },
          },
        ];
      }

      return await this.prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: {
          customer: true,
          product: true,
          transporter: true,
          plantCode: true,
          salesZone: true,
          packConfig: true,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Failed to fetch sales orders',
        error.message,
      );
    }
  }

  async findOne(id: number, userId: number) {
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
      throw new NotFoundException('Sales order not found or access denied');
    }

    return order;
  }

  async update(id: number, dto: UpdateSalesCrudDto, userId: number) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Sales order not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this order',
      );
    }

    try {
      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(dto.deliveryDate).toISOString()
          : dto.deliveryDate;

      return await this.prisma.salesOrder.update({
        where: { id },
        data: { ...dto, deliveryDate },
        include: {
          customer: true,
          product: true,
          transporter: true,
          plantCode: true,
          salesZone: true,
          packConfig: true,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Failed to update sales order',
        error.message,
      );
    }
  }

  async remove(id: number, userId: number) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Sales order not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this order',
      );
    }

    try {
      return await this.prisma.salesOrder.delete({
        where: { id },
      });
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Failed to delete sales order',
        error.message,
      );
    }
  }

  async getPaginatedOrders(
    page: number,
    limit: number,
    userId: number,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };

    if (search) {
      const s = { contains: search }; 

      whereClause.OR = [
        { saleOrderNumber: s },
        { outboundDelivery: s },
        { transferOrder: s },
        { status: s },
        { specialRemarks: s },
        ...(['true', 'false'].includes(search.toLowerCase())
          ? [{ paymentClearance: search.toLowerCase() === 'true' }]
          : []),

        // === relational filters – NOTE the “equals” wrapper ===
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
        orderBy: { createdAt: 'asc' },
        include: {
          customer: true,
          product: true,
          transporter: true,
          plantCode: true,
          salesZone: true,
          packConfig: true,
        },
      }),
      this.prisma.salesOrder.count({ where: whereClause }),
    ]);

    return {
      orders,
      totalCount,
    };
  }
}
