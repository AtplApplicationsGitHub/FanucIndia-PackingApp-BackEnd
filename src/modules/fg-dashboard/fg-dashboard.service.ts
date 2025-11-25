import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FgDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getFgDashboardData(
    user: { userId: number; role: string },
    query: { search?: string; date?: string; page?: number; limit?: number }
  ) {
    const { search, date, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.SalesOrderWhereInput = {};

    if (date) {
      const parseYMD = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return { y, m, d };
      };

      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

      const { y, m, d } = parseYMD(date);
      const startIST = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
      const endISTExclusive = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);

      where.deliveryDate = {
        gte: startIST,         
        lt: endISTExclusive,   
      };
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      let paymentBoolean: boolean | undefined = undefined;

      if (lowerSearch === 'yes') {
        paymentBoolean = true;
      } else if (lowerSearch === 'no') {
        paymentBoolean = false;
      }

      where.OR = [
        { saleOrderNumber: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { status: { contains: search, mode: 'insensitive' } },
        { fgLocation: { contains: search, mode: 'insensitive' } },
        { specialRemarks: { contains: search, mode: 'insensitive' } },
        { UpdatedBy: { contains: search, mode: 'insensitive' } },
        ...(paymentBoolean !== undefined ? [{ paymentClearance: { equals: paymentBoolean } }] : []),
      ];
    }

    const [salesOrders, totalCount] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        select: {
          id: true,
          deliveryDate: true,
          saleOrderNumber: true,
          transferOrder: true,
          paymentClearance: true,
          status: true,
          fgLocation: true,
          specialRemarks: true,
          UpdatedBy: true,
          UpdatedDate: true,
          product: { select: { name: true } },
          customer: { select: { name: true } },
          salesZone: { select: { name: true } },
        },
        orderBy: {
          id: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    const fgData = salesOrders.map((order) => ({
      id: order.id,
      deliveryDate: order.deliveryDate,
      saleOrderNumber: order.saleOrderNumber,
      transferOrder: order.transferOrder,
      product: order.product?.name,
      customerName: order.customer?.name,
      salesZone: order.salesZone?.name,
      payment: order.paymentClearance,
      status: order.status,
      fgLocation: order.fgLocation,
      specialRemarks: order.specialRemarks,
      updatedBy: order.UpdatedBy,
      updatedDate: order.UpdatedDate,
    }));

    return { data: fgData, totalCount };
  }
}