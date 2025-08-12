import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SalesCrudService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSalesCrudDto, userId: number) {
    try {
      // Normalize deliveryDate
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
    } catch (err: any) {
      // Unique constraint violation (e.g. on saleOrderNumber)
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException(
            'A sales order with that reference already exists.',
          );
        }
      }
      // Any other error
      throw new InternalServerErrorException(
        'Failed to create sales order.',
        err.message,
      );
    }
  }

  async findAll(userId: number, query: { search?: string }) {
    try {
      const { search } = query;
      const where: any = { userId };

      if (search) {
        const s = { contains: search };
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

  async update(
    id: number,
    dto: UpdateSalesCrudDto,
    userId: number,
  ) {
    // Ensure existence & permission first
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Sales order not found.');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this order.',
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
    } catch (err: any) {
      // Record not found at update time
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
    // Ensure existence & permission first
    const existing = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Sales order not found.');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this order.',
      );
    }

    try {
      await this.prisma.salesOrder.delete({ where: { id } });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
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
          },
        }),
        this.prisma.salesOrder.count({ where: whereClause }),
      ]);

      return { orders, totalCount };
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to fetch paginated sales orders.',
        err.message,
      );
    }
  }
}
