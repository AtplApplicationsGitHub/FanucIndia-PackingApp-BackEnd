import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SalesKpiDto } from './dto/sales-kpi.dto';
import { SalesActivityDto } from './dto/sales-activity.dto'; // We will create this DTO next

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets the KPI counts for a specific SALES user.
   * @param userId The ID of the logged-in SALES user.
   */
  async getSalesKpis(userId: number): Promise<SalesKpiDto> {
    const now = new Date();

    // We run all count queries concurrently for best performance
    const [
      totalSoCount,
      dispatchedSoCount,
      overdueSoCount,
      r105Count,
      w105Count,
      f105Count,
    ] = await this.prisma.$transaction([
      // 1. TOTAL SO COUNT
      this.prisma.salesOrder.count({
        where: { userId: userId },
      }),

      // 2. DISPATCHED ORDERS (for KPI card)
      this.prisma.salesOrder.count({
        where: {
          userId: userId,
          status: 'Dispatched',
        },
      }),

      // 3. OVERDUE ORDERS
      this.prisma.salesOrder.count({
        where: {
          userId: userId,
          deliveryDate: { lt: now },
          status: { not: 'Dispatched' },
        },
      }),

      // --- NEW QUERIES FOR PIE CHART ---

      // 4. R105 (Assigned/Imported)
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'R105' },
      }),

      // 5. W105 (Issued)
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'W105' },
      }),

      // 6. F105 (Packed)
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'F105' },
      }),
    ]);

    return {
      totalSoCount,
      dispatchedSoCount,
      overdueSoCount,
      r105Count,
      w105Count,
      f105Count,
    };
  }

  /**
   * Gets the 5 most recent activities for a SALES user.
   * @param userId The ID of the logged-in SALES user.
   */
  async getSalesRecentActivity(userId: number): Promise<SalesActivityDto[]> {
    // 1. Find all SO Numbers created by this sales user
    const userOrders = await this.prisma.salesOrder.findMany({
      where: { userId: userId },
      select: { saleOrderNumber: true },
    });

    if (userOrders.length === 0) {
      return []; // No orders, so no activity
    }

    const userSoNumbers = userOrders.map((o) => o.saleOrderNumber);

    // 2. Find the 5 most recent "stepper" events for those SOs
    const activities = await this.prisma.sO_Status_Stepper.findMany({
      where: {
        salesOrderNumber: { in: userSoNumbers },
        createdDateTime: { not: null }, // Only get events that have occurred
      },
      select: {
        salesOrderNumber: true,
        status: true,
        createdDateTime: true,
      },
      orderBy: {
        createdDateTime: 'desc', // Get the most recent first
      },
      take: 5, // Limit to 5
    });

    // 3. Map to the DTO
    return activities.map((act) => ({
      salesOrderNumber: act.salesOrderNumber,
      status: act.status,
      activityTimestamp: act.createdDateTime!, // We know it's not null from the where clause
    }));
  }
  
}