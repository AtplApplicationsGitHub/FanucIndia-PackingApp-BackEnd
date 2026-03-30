import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArchivedDataService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const {
      page = 1,
      limit = 20,
      search,
      paymentFilter,
      zoneFilter,
      statusFilter,
      startDate,
      endDate,
    } = query;

    const parsedPage = Number(page) > 0 ? Number(page) : 1;
    const parsedLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;

    const where: Prisma.SalesOrderArchiveWhereInput = {};

    // 1. Exact Match Filters
    if (paymentFilter) {
      where.paymentClearance = paymentFilter === 'true';
    }

    if (zoneFilter) {
      where.salesZoneId = Number(zoneFilter);
    }

    if (statusFilter) {
      if (statusFilter === 'None') {
        where.OR = [{ status: null }, { status: '' }];
      } else {
        where.status = statusFilter;
      }
    }

    // 2. Date Filters (Handling IST offsets to match your existing logic)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const parseYMD = (s: string) => {
      const [y, m, d] = s.split('-').map(Number);
      return { y, m, d };
    };

    if (startDate || endDate) {
      const range: { gte?: Date; lt?: Date } = {};
      if (startDate) {
        const { y, m, d } = parseYMD(startDate);
        range.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
      }
      if (endDate) {
        const { y, m, d } = parseYMD(endDate);
        range.lt = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);
      }
      where.deliveryDate = range;
    }

    // 3. Global Search Logic
    if (search) {
      const searchStr = search.toLowerCase();
      where.OR = [
        ...(where.OR || []),
        { saleOrderNumber: { contains: search, mode: 'insensitive' } },
        { outboundDelivery: { contains: search, mode: 'insensitive' } },
        { transferOrder: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { customerNameText: { contains: search, mode: 'insensitive' } },
        
        // Relational Text Searches
        { product: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { salesZone: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { customer: { is: { name: { contains: search, mode: 'insensitive' } } } },
      ];

      // Handle Boolean Search for Payment
      if (searchStr === 'yes') {
        where.OR.push({ paymentClearance: true });
      } else if (searchStr === 'no') {
        where.OR.push({ paymentClearance: false });
      }
    }

    try {
      const total = await this.prisma.salesOrderArchive.count({ where });
      if (total === 0) {
        return { total: 0, page: parsedPage, limit: parsedLimit, data: [] };
      }

      const skip = (parsedPage - 1) * parsedLimit;
      const data = await this.prisma.salesOrderArchive.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { archivedAt: 'desc' }, // Show newest archives first
        include: {
          product: { select: { name: true } },
          salesZone: { select: { name: true } },
          customer: { select: { name: true } },
        },
      });

      // 4. Clean formatting specifically requested for the frontend
      const formattedData = data.map((order) => ({
        id: order.id,
        product: order.product?.name,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        transferOrder: order.transferOrder,
        requiredDate: order.deliveryDate,
        payment: order.paymentClearance,
        salesZone: order.salesZone?.name,
        customer: order.customer?.name || order.customerNameText,
        status: order.status,
        archivedAt: order.archivedAt,
      }));

      return {
        total,
        page: parsedPage,
        limit: parsedLimit,
        data: formattedData,
      };
    } catch (err) {
      console.error(err);
      throw new BadRequestException('Failed to fetch archived data. Did you forget to update the Prisma Schema and generate the client?');
    }
  }
}