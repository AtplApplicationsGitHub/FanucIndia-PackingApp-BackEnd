import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async findAssignedOrders(userId: number) {
    const assignedOrders = await this.prisma.salesOrder.findMany({
      where: {
        assignedUserId: userId,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        packConfig: {
          select: {
            configName: true,
          },
        },
        materialData: {
          select: {
            Required_Qty: true,
            Issue_stage: true,
            Packing_stage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const incompleteOrders = assignedOrders.filter(order => {
      if (order.materialData.length === 0) {
        return true;
      }

      const isComplete = order.materialData.every(
        material =>
          material.Required_Qty > 0 &&
          material.Required_Qty === material.Issue_stage &&
          material.Issue_stage === material.Packing_stage
      );

      return !isComplete;
    });
    
    return incompleteOrders.map(({ materialData, ...order }) => order);
  }

  async findOrderById(orderId: number, userId: number, userRole: string) {
    const whereClause: Prisma.SalesOrderWhereUniqueInput = { id: orderId };

    if (userRole !== 'ADMIN') {
      whereClause.assignedUserId = userId;
    }

    return this.prisma.salesOrder.findFirst({
      where: whereClause,
      include: {
        customer: true,
      },
    });
  }

  async getAssignedOrdersSummary(userId: number) {
    const assignedOrders = await this.prisma.salesOrder.findMany({
      where: {
        assignedUserId: userId,
      },
      select: {
        saleOrderNumber: true,
        priority: true,
        status: true,
        materialData: {
          select: {
            Required_Qty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assignedOrders.map(order => {
      const totalMaterials = order.materialData.length;
      const totalItems = order.materialData.reduce((sum, material) => sum + material.Required_Qty, 0);

      return {
        saleOrderNumber: order.saleOrderNumber,
        priority: order.priority,
        status: order.status,
        totalMaterials,
        totalItems,
      };
    });
  }
}
