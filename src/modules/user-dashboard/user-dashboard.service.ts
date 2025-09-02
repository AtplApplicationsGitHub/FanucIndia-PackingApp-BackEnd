import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async findAssignedOrders(userId: number) {
    // 1. Fetch all orders assigned to the user, including their materials
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

    // 2. Filter out the completed orders in the application code
    const incompleteOrders = assignedOrders.filter(order => {
      // If an order has no materials, it's considered incomplete and should be shown.
      if (order.materialData.length === 0) {
        return true;
      }

      // Check if every material is fully issued and packed
      const isComplete = order.materialData.every(
        material =>
          material.Required_Qty > 0 &&
          material.Required_Qty === material.Issue_stage &&
          material.Issue_stage === material.Packing_stage
      );

      // Return true for orders that are NOT complete
      return !isComplete;
    });
    
    // 3. Map the result to the required format, removing the materialData
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
}
