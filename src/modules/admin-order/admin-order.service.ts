import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateAdminOrderDto } from './dto/update-admin-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminOrderService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const {
      page = 1,
      limit = 20,
      product,
      date,
      sortBy = 'createdAt',
      sortOrder = 'asc',
    } = query;

    // Normalize pagination
    const parsedPage  = Number(page)  > 0 ? Number(page)  : 1;
    const parsedLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;

    // Validate sorting
    const allowedSortFields = ['createdAt', 'priority', 'status', 'deliveryDate'];
    const allowedSortOrders = ['asc', 'desc'];
    const sortField      = allowedSortFields.includes(sortBy)    ? sortBy    : 'createdAt';
    const orderDirection = allowedSortOrders.includes(sortOrder) ? sortOrder : 'asc';

    // Build filters
    const where: any = {};
    if (product) {
      // Note: removed `mode: 'insensitive'` because nullable String filters don't support it
      where.product = {
        is: {
          name: {
            contains: product,
          },
        },
      };
    }
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end   = new Date(start);
      end.setDate(end.getDate() + 1);
      where.deliveryDate = { gte: start, lt: end };
    }

    try {
      // 1) Count total
      const total = await this.prisma.salesOrder.count({ where });

      // 2) Early return if none
      if (total === 0) {
        return { total: 0, page: 1, limit: 0, data: [] };
      }

      const isFilterActive = !!product || !!date;
      const skip = isFilterActive ? 0 : (parsedPage - 1) * parsedLimit;
      const take = isFilterActive ? total : parsedLimit;

      // 3) Fetch data
      const data = await this.prisma.salesOrder.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take,
        include: {
          user:        { select: { id: true, email: true } },
          product:     { select: { id: true, name: true, code: true } },
          transporter: { select: { id: true, name: true } },
          plantCode:   { select: { id: true, code: true, description: true } },
          salesZone:   { select: { id: true, name: true } },
          packConfig:  { select: { id: true, configName: true } },
          terminal: { select: { id: true, name: true } },
        },
      });

      return {
        total,
        page:  isFilterActive ? 1 : parsedPage,
        limit: isFilterActive ? total : parsedLimit,
        data,
      };
    } catch (err) {

      // If it's a Prisma validation error, return its message
      if (err instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(err.message);
      }
      // Otherwise a generic message
      throw new BadRequestException('Failed to fetch sales orders.');
    }
  }

  async update(id: number, dto: UpdateAdminOrderDto) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.prisma.salesOrder.update({
      where: { id },
      data: dto,
    });
  }
}
