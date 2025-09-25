import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async downloadOrderDetails(orderId: number, userId: number, userRole: string) {
    const order = await this.findOrderById(orderId, userId, userRole);
    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    const materialDetails = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: order.saleOrderNumber,
      },
      select: {
        Material_Code: true,
        Material_Description: true,
        Bin_No: true,
        A_D_F: true,
        Required_Qty: true,
        Issue_stage: true,
        Packing_stage: true,
      },
    });

    return materialDetails;
  }

  async downloadOrderDetailsBySoNumber(saleOrderNumber: string, userId: number, userRole: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { saleOrderNumber },
    });

    if (!order) {
      throw new NotFoundException('Sales Order not found.');
    }

    if (userRole === 'USER' && order.assignedUserId !== userId) {
      throw new ForbiddenException('You are not authorized to view this order.');
    }

    const materialDetails = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: order.saleOrderNumber,
      },
      select: {
        Material_Code: true,
        Material_Description: true,
        Bin_No: true,
        A_D_F: true,
        Required_Qty: true,
        Issue_stage: true,
        Packing_stage: true,
      },
    });

    return materialDetails;
  }
}