import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateAdminOrderDto } from './dto/update-admin-order.dto';

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

    const parsedPage = Number(page) > 0 ? Number(page) : 1;
    const parsedLimit =
      Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;

    const allowedSortFields = [
      'createdAt',
      'priority',
      'status',
      'deliveryDate',
      'product',
    ];
    const allowedSortOrders = ['asc', 'desc'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = allowedSortOrders.includes(sortOrder)
      ? sortOrder
      : 'asc';

    const where: any = {};

    if (product) {
      where.product = {
        name: { contains: product, mode: 'insensitive' },
      };
    }

    if (date) {
      const start = new Date(date + 'T00:00:00');
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.deliveryDate = { gte: start, lt: end };
    }

    const total = await this.prisma.salesOrder.count({ where });

    const isFilterActive = !!product || !!date;
    const skip = isFilterActive ? 0 : (parsedPage - 1) * parsedLimit;
    const take = isFilterActive ? total : parsedLimit;

    // === MAIN CHANGE: Add include ===
    const data = await this.prisma.salesOrder.findMany({
      where,
      orderBy: { [sortField]: orderDirection },
      skip,
      take,
      include: {
        product: true,
        transporter: true,
        plantCode: true,
        salesZone: true,
        packConfig: true,
        user: true,
      },
    });

    return {
      total,
      page: isFilterActive ? 1 : parsedPage,
      limit: isFilterActive ? total : parsedLimit,
      data,
    };
  }

  async update(id: number, dto: UpdateAdminOrderDto) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.salesOrder.update({
      where: { id },
      data: dto,
    });
  }
}
