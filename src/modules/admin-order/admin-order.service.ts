import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
      search,
      date,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
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

    // Parse "YYYY-MM-DD" as **local** date (not UTC)
    const parseYMDLocal = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d); // local midnight
    };

    if (startDate || endDate) {
      const range: { gte?: Date; lt?: Date } = {};

      if (startDate) {
        const s = parseYMDLocal(startDate);
        s.setHours(0, 0, 0, 0); // local start of day
        range.gte = s;
      }

      if (endDate) {
        const e = parseYMDLocal(endDate);
        // end is inclusive → use < (next local day 00:00)
        const next = new Date(
          e.getFullYear(),
          e.getMonth(),
          e.getDate() + 1,
          0,
          0,
          0,
          0,
        );
        range.lt = next;
      }

      // apply to deliveryDate; change to createdAt if that's what you intend
      where.deliveryDate = { ...(where.deliveryDate as object), ...range };
    }

    if (search) {
      const lower = search.toLowerCase();
      const num = Number(search);

      where.OR = [
        { user: { is: { name: { contains: search } } } },
        { product: { is: { name: { contains: search } } } },
        { transporter: { is: { name: { contains: search } } } },
        { plantCode: { is: { code: { contains: search } } } },
        { salesZone: { is: { name: { contains: search } } } },
        { packConfig: { is: { configName: { contains: search } } } },
        { assignedUser: { is: { name: { contains: search } } } },

        { saleOrderNumber: { contains: search } },
        { outboundDelivery: { contains: search } },
        { transferOrder: { contains: search } },
        { status: { contains: search } },
        { specialRemarks: { contains: search } },

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
          product: { select: { id: true, name: true, code: true } },
          transporter: { select: { id: true, name: true } },
          plantCode: { select: { id: true, code: true, description: true } },
          salesZone: { select: { id: true, name: true } },
          packConfig: { select: { id: true, configName: true } },
          assignedUser: { select: { id: true, name: true } },
        },
      });

      return {
        total,
        page: isFilterActive ? 1 : parsedPage,
        limit: isFilterActive ? total : parsedLimit,
        data,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException(err.message);
      }
      throw new BadRequestException('Failed to fetch sales orders.');
    }
  }

  async update(id: number, dto: UpdateAdminOrderDto) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.salesOrder.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Sales order not found');
    }
    await this.prisma.salesOrder.delete({ where: { id } });
    return { message: 'Sales order deleted successfully' };
  }
}
