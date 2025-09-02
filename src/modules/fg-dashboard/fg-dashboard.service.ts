import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FgDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getFgDashboardData(user: { userId: number; role: string }) {
    const where: Prisma.SalesOrderWhereInput = {};

    // If the user is not an admin, only show orders assigned to them
    if (user.role === 'USER') {
      where.assignedUserId = user.userId;
    }

    const salesOrders = await this.prisma.salesOrder.findMany({
      where,
      include: {
        product: true,
        customer: true,
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