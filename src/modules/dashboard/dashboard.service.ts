import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SalesKpiDto } from './dto/sales-kpi.dto';
import { SalesActivityDto } from './dto/sales-activity.dto';
import { AdminKpiDto } from './dto/admin-kpi.dto';
import { SalesPaymentClearanceDto } from './dto/sales-payment-clearance.dto'; // <-- Import new DTO

/**
 * Calculates percentage change, handling division by zero.
 */
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100.0 : 0.0; // If previous was 0, any increase is 100%
  }
  const change = ((current - previous) / previous) * 100;
  return parseFloat(change.toFixed(1)); // Return with one decimal place
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets the KPI counts for the ADMIN dashboard.
   */
  async getAdminKpis(): Promise<AdminKpiDto> {
    // ... (existing getAdminKpis logic)
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const firstDayPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const [
      totalSoCount,
      newSoCurrentMonth,
      newSoPreviousMonth,
      overdueCount,
      overdueCountPrevious,
      dispatchedTotalCount,
      dispatchedCurrentMonth,
      dispatchedPreviousMonth,
    ] = await this.prisma.$transaction([
      // 1. Total SO Count (Main KPI)
      this.prisma.salesOrder.count(),

      // 2. New SO This Month (for % change)
      this.prisma.salesOrder.count({
        where: {
          createdAt: {
            gte: firstDayCurrentMonth,
            lt: firstDayNextMonth,
          },
        },
      }),

      // 3. New SO Last Month (for % change)
      this.prisma.salesOrder.count({
        where: {
          createdAt: {
            gte: firstDayPreviousMonth,
            lt: firstDayCurrentMonth,
          },
        },
      }),

      // 4. Overdue Count (Main KPI - Snapshot NOW)
      this.prisma.salesOrder.count({
        where: {
          deliveryDate: { lt: now },
          status: { not: 'Dispatched' },
        },
      }),

      // 5. Overdue Count (Snapshot at START of month - for % change)
      this.prisma.salesOrder.count({
        where: {
          deliveryDate: { lt: firstDayCurrentMonth },
          status: { not: 'Dispatched' },
        },
      }),

      // 6. Dispatched Count (Main KPI)
      this.prisma.salesOrder.count({
        where: { status: 'Dispatched' },
      }),

      // 7. Dispatched This Month (for % change - from Stepper)
      this.prisma.sO_Status_Stepper.count({
        where: {
          status: 'Dispatched',
          createdDateTime: {
            gte: firstDayCurrentMonth,
            lt: firstDayNextMonth,
          },
        },
      }),

      // 8. Dispatched Last Month (for % change - from Stepper)
      this.prisma.sO_Status_Stepper.count({
        where: {
          status: 'Dispatched',
          createdDateTime: {
            gte: firstDayPreviousMonth,
            lt: firstDayCurrentMonth,
          },
        },
      }),
    ]);

    // Calculate percentages
    const totalSoCountPercentageChange = calculatePercentageChange(
      newSoCurrentMonth,
      newSoPreviousMonth,
    );
    const overdueSoCountPercentageChange = calculatePercentageChange(
      overdueCount,
      overdueCountPrevious,
    );
    const dispatchedSoCountPercentageChange = calculatePercentageChange(
      dispatchedCurrentMonth,
      dispatchedPreviousMonth,
    );

    return {
      totalSoCount,
      totalSoCountPercentageChange,
      overdueSoCount: overdueCount,
      overdueSoCountPercentageChange,
      dispatchedSoCount: dispatchedTotalCount,
      dispatchedSoCountPercentageChange,
    };
  }

  /**
   * Gets the KPI counts for a specific SALES user.
   * @param userId The ID of the logged-in SALES user.
   */
  async getSalesKpis(userId: number): Promise<SalesKpiDto> {
    // ... (existing getSalesKpis logic from previous step)
    const [
      totalSoCount,
      dispatchedSoCount,
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

      // 3. R105 (Assigned/Imported)
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'R105' },
      }),

      // 4. W105 (Issued)
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'W105' },
      }),

      // 5. F105 (Packed)
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'F105' },
      }),
    ]);

    return {
      totalSoCount,
      dispatchedSoCount,
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
    // ... (existing getSalesRecentActivity logic)
    const userOrders = await this.prisma.salesOrder.findMany({
      where: { userId: userId },
      select: { saleOrderNumber: true },
    });

    if (userOrders.length === 0) {
      return [];
    }

    const userSoNumbers = userOrders.map((o) => o.saleOrderNumber);

    const activities = await this.prisma.sO_Status_Stepper.findMany({
      where: {
        salesOrderNumber: { in: userSoNumbers },
        createdDateTime: { not: null },
      },
      select: {
        salesOrderNumber: true,
        status: true,
        createdDateTime: true,
      },
      orderBy: {
        createdDateTime: 'desc',
      },
      take: 5,
    });

    return activities.map((act) => ({
      salesOrderNumber: act.salesOrderNumber,
      status: act.status,
      activityTimestamp: act.createdDateTime!,
    }));
  }

  // --- NEW METHOD FOR THE GRAPH ---

  /**
   * Gets payment clearance counts grouped by sales zone for a SALES user.
   * Only counts non-dispatched orders.
   * @param userId The ID of the logged-in SALES user.
   */
  async getSalesPaymentClearanceByZone(
    userId: number,
  ): Promise<SalesPaymentClearanceDto[]> {
    // 1. Get all possible sales zones
    const allZones = await this.prisma.salesZone.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // 2. Get the grouped counts for the specific user and non-dispatched orders
    const rawCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'paymentClearance'],
      where: {
        userId: userId,
        status: { not: 'Dispatched' }, // <-- Filters for non-dispatched
      },
      _count: {
        id: true, // Count orders
      },
    });

    // 3. Process the raw data into the desired DTO format

    // Initialize a map with all zones having 0 counts
    const resultsMap = new Map<number, SalesPaymentClearanceDto>();
    for (const zone of allZones) {
      resultsMap.set(zone.id, {
        zoneName: zone.name,
        paymentCleared: 0,
        paymentPending: 0,
      });
    }

    // Populate the map with actual counts from the query
    for (const countData of rawCounts) {
      const zone = resultsMap.get(countData.salesZoneId);
      if (zone) {
        if (countData.paymentClearance === true) {
          zone.paymentCleared = countData._count.id;
        } else {
          // This will catch false and null values
          zone.paymentPending = countData._count.id;
        }
      }
    }

    // 4. Return the values from the map as an array
    return Array.from(resultsMap.values());
  }
}