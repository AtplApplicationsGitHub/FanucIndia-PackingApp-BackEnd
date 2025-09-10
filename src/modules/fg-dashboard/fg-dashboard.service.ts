import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FgDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getFgDashboardData(user: { userId: number; role: string }, query: { search?: string, date?: string }) {
    const { search, date } = query;
    const where: Prisma.SalesOrderWhereInput = {};

    if (user.role === 'USER') {
      where.assignedUserId = user.userId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.deliveryDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (search) {
      where.OR = [
        { saleOrderNumber: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { status: { contains: search, mode: 'insensitive' } },
        { fgLocation: { contains: search, mode: 'insensitive' } },
        { specialRemarks: { contains: search, mode: 'insensitive' } },
      ];
    }


    const salesOrders = await this.prisma.salesOrder.findMany({
      where,
      include: {
        product: true,
        customer: true,
      },
      orderBy: {
        deliveryDate: 'desc',
      },
    });

    const fgData = await Promise.all(
      salesOrders.map(async (order) => {
        const materialData = await this.prisma.eRP_Material_Data.findFirst({
          where: { saleOrderNumber: order.saleOrderNumber },
          orderBy: { UpdatedDate: 'desc' },
        });

        return {
          id: order.id,
          deliveryDate: order.deliveryDate,
          saleOrderNumber: order.saleOrderNumber,
          product: order.product?.name,
          customerName: order.customer?.name,
          payment: order.paymentClearance,
          status: order.status,
          fgLocation: order.fgLocation,
          specialRemarks: order.specialRemarks,
          updatedBy: materialData?.UpdatedBy,
          updatedDate: materialData?.UpdatedDate,
        };
      }),
    );
    return fgData;
  }
}