import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SalesKpiDto } from './dto/sales-kpi.dto';
import { SalesActivityDto } from './dto/sales-activity.dto';
import { AdminKpiDto } from './dto/admin-kpi.dto';
import { SalesPaymentClearanceDto } from './dto/sales-payment-clearance.dto';
import { AdminNewImportDto } from './dto/admin-new-imports.dto'; 
import { AdminDispatchSummaryDto } from './dto/admin-dispatch-summary.dto';
import { AdminOverallStatusDto } from './dto/admin-overall-status.dto'; 
import { AdminStatusByZoneDto } from './dto/admin-status-by-zone.dto';
import { AdminPaymentByZoneDto } from './dto/admin-payment-by-zone.dto';
import { AdminCountByEntityDto } from './dto/admin-count-by-entity.dto';

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

/**
 * Helper to get date boundaries for queries, aware of IST.
 * This creates UTC timestamps that represent the start/end of a day in IST.
 */
function getDayBoundariesIST(date: Date) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  // Get date components in local time (which we assume is IST for the server)
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  const d = date.getDate();

  // Create start of day in UTC, then subtract offset to get IST start-of-day
  const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS);

  // Create start of *next* day in UTC, then subtract offset
  const endOfDay = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - IST_OFFSET_MS);

  return { startOfDay, endOfDay };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets the KPI counts for the ADMIN dashboard.
   */
  async getAdminKpis(): Promise<AdminKpiDto> {
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const firstDayPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    
    // Use the IST-aware helper to get the start of today
    const { startOfDay: startOfToday } = getDayBoundariesIST(now);

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
          deliveryDate: { lt: startOfToday },
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

  // --- NEW ADMIN METHODS ---

  async getAdminNewImports(): Promise<AdminNewImportDto[]> {
    const results: AdminNewImportDto[] = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      
      // Use IST-aware boundaries
      const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);

      // Count SalesOrders created on this day
      const count = await this.prisma.salesOrder.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      const formattedDate = targetDate.toISOString().split('T')[0];
      let dayLabel: string;
      if (i === 0) dayLabel = `Today (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else if (i === 1) dayLabel = `Yesterday (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else dayLabel = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      results.push({
        dayLabel: dayLabel,
        date: formattedDate,
        count: count,
      });
    }

    return results;
  }

  async getAdminDispatchSummary(): Promise<AdminDispatchSummaryDto> {
    const { startOfDay, endOfDay } = getDayBoundariesIST(new Date());

    const [ordersToBeDispatched, readyForDispatchToday, ordersDispatchedToday] =
      await this.prisma.$transaction([
        // 1. Orders to be Dispatched Today (Pending + Ready)
        this.prisma.salesOrder.count({
          where: {
            deliveryDate: {
              gte: startOfDay,
              lt: endOfDay,
            },
            OR: [
              { status: null },
              { status: { not: 'Dispatched' } },
            ],
          },
        }),

        // 2. Ready for Dispatch Today
        // Since status is no longer updated on SalesOrder, we check the Stepper
        this.prisma.salesOrder.count({
          where: {
            deliveryDate: {
              gte: startOfDay,
              lt: endOfDay,
            },
            status: { not: 'Dispatched' }, // Ensure not already dispatched
            statusStepper: {
              some: {
                status: 'Ready for Dispatch',
                createdDateTime: { not: null }
              }
            }
          },
        }),

        // 3. Orders Dispatched Today
        this.prisma.sO_Status_Stepper.count({
          where: {
            status: 'Dispatched',
            createdDateTime: {
              gte: startOfDay,
              lt: endOfDay,
            },
          },
        }),
      ]);

    return {
      ordersToBeDispatched,
      readyForDispatchToday,
      ordersDispatchedToday,
    };
  }

  async getAdminOverallStatus(): Promise<AdminOverallStatusDto> {
    const [statusCounts, totalOrders] = await Promise.all([
    this.prisma.salesOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    this.prisma.salesOrder.count(), 
  ]);

    const result: AdminOverallStatusDto = {
      totalOrders,
      toBeIssuedCount: 0,
      r105Count: 0,
      w105Count: 0,
      f105Count: 0,
      dispatchedCount: 0,
    };

    for (const group of statusCounts) {
      if (group.status === null) {
        result.toBeIssuedCount = group._count.id; 
      } else {
        switch (group.status) {
          case 'R105': result.r105Count = group._count.id; break;
          case 'W105': result.w105Count = group._count.id; break;
          case 'F105': result.f105Count = group._count.id; break;
          case 'Dispatched': result.dispatchedCount = group._count.id; break;
        }
      }
    }
    return result;
  }

  // --- ROW 3: ORDER STATUS BY ZONE ---

  async getAdminStatusByZone(): Promise<AdminStatusByZoneDto[]> {
    const allZones = await this.prisma.salesZone.findMany({
      select: { id: true, name: true },
    });

    const statusCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'status'],
      _count: { id: true },
    });

    const resultsMap = new Map<number, AdminStatusByZoneDto>();
    for (const zone of allZones) {
      resultsMap.set(zone.id, {
        zoneName: zone.name,
        toBeIssuedCount: 0,
        r105Count: 0,
        w105Count: 0,
        f105Count: 0,
        dispatchedCount: 0,
      });
    }

    for (const group of statusCounts) {
      const zone = resultsMap.get(group.salesZoneId);
      if (zone) {
        if (group.status === null) {
          zone.toBeIssuedCount = group._count.id; 
        } else {
          switch (group.status) {
            case 'R105': zone.r105Count = group._count.id; break;
            case 'W105': zone.w105Count = group._count.id; break;
            case 'F105': zone.f105Count = group._count.id; break;
            case 'Dispatched': zone.dispatchedCount = group._count.id; break;
          }
        }
      }
    }

    return Array.from(resultsMap.values());
  }

  // --- ROW 4: PAYMENT CLEARANCE BY ZONE ---

  async getAdminPaymentByZone(): Promise<AdminPaymentByZoneDto[]> {
    const allZones = await this.prisma.salesZone.findMany({
      select: { id: true, name: true },
    });

    const paymentCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'paymentClearance'],
      _count: { id: true },
    });

    const resultsMap = new Map<number, AdminPaymentByZoneDto>();
    for (const zone of allZones) {
      resultsMap.set(zone.id, {
        zoneName: zone.name,
        paymentCleared: 0,
        paymentPending: 0,
      });
    }

    for (const group of paymentCounts) {
      const zone = resultsMap.get(group.salesZoneId);
      if (zone) {
        if (group.paymentClearance === true) {
          zone.paymentCleared = group._count.id;
        } else {
          zone.paymentPending = group._count.id;
        }
      }
    }

    return Array.from(resultsMap.values());
  }

  // --- ROW 5: ORDERS BY PRODUCT & CUSTOMER (TOP 5) ---

  async getAdminOrdersByProduct(): Promise<AdminCountByEntityDto[]> {
    const counts = await this.prisma.salesOrder.groupBy({
      by: ['productId'],
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 5, // Top 5
    });

    const productIds = counts.map((c) => c.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return counts.map((group) => ({
      name: productMap.get(group.productId) || 'Unknown Product',
      count: group._count.id,
    }));
  }

  async getAdminOrdersByCustomer(): Promise<AdminCountByEntityDto[]> {
    const counts = await this.prisma.salesOrder.groupBy({
      by: ['customerId'],
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 5, // Top 5
    });

    const customerIds = counts.map((c) => c.customerId).filter(Boolean) as number[];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    return counts.map((group) => ({
      name: group.customerId ? customerMap.get(group.customerId) || 'Unknown Customer' : 'No Customer',
      count: group._count.id,
    }));
  }

  // --- EXISTING SALES METHODS ---

  async getSalesKpis(userId: number): Promise<SalesKpiDto> {
    const [
      totalSoCount,
      dispatchedSoCount,
      r105Count,
      w105Count,
      f105Count,
      toBeIssuedCount, 
    ] = await this.prisma.$transaction([
      this.prisma.salesOrder.count({ where: { userId: userId } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: 'Dispatched' } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: 'R105' } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: 'W105' } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: 'F105' } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: null } }), 
    ]);

    return {
      totalSoCount,
      dispatchedSoCount,
      r105Count,
      w105Count,
      f105Count,
      toBeIssuedCount, 
    };
  }

  async getSalesRecentActivity(userId: number): Promise<SalesActivityDto[]> {
    const userOrders = await this.prisma.salesOrder.findMany({
      where: { userId: userId },
      select: { saleOrderNumber: true },
    });
    if (userOrders.length === 0) {
      return [];
    }
    const userSoNumbers = userOrders.map((o) => o.saleOrderNumber);

    const latestActivityGroups = await this.prisma.sO_Status_Stepper.groupBy({
      by: ['salesOrderNumber'],
      _max: {
        createdDateTime: true,
      },
      where: {
        salesOrderNumber: { in: userSoNumbers },
        createdDateTime: { not: null },
      },
      orderBy: {
        _max: {
          createdDateTime: 'desc',
        },
      },
      take: 5,
    });

    if (latestActivityGroups.length === 0) {
      return [];
    }

    const whereConditions = latestActivityGroups.map((group) => ({
      salesOrderNumber: group.salesOrderNumber,
      createdDateTime: group._max.createdDateTime!,
    }));

    const activities = await this.prisma.sO_Status_Stepper.findMany({
      where: {
        OR: whereConditions,
      },
      select: {
        salesOrderNumber: true,
        status: true,
        createdDateTime: true,
      },
      orderBy: {
        createdDateTime: 'desc',
      },
    });

    return activities.map((act) => ({
      salesOrderNumber: act.salesOrderNumber,
      status: act.status,
      activityTimestamp: act.createdDateTime!,
    }));
  }

  async getSalesPaymentClearanceByZone(
    userId: number,
  ): Promise<SalesPaymentClearanceDto[]> {
    
    const rawCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'paymentClearance'],
      where: {
        userId: userId,
      },
      _count: {
        id: true,
      },
    });

    if (rawCounts.length === 0) {
      return [];
    }

    const zoneIds = [...new Set(rawCounts.map((r) => r.salesZoneId))];

    const zones = await this.prisma.salesZone.findMany({
      where: {
        id: { in: zoneIds },
      },
      select: { id: true, name: true },
    });

    const resultsMap = new Map<number, SalesPaymentClearanceDto>();
    for (const zone of zones) {
      resultsMap.set(zone.id, {
        zoneName: zone.name,
        paymentCleared: 0,
        paymentPending: 0,
      });
    }

    for (const countData of rawCounts) {
      const zone = resultsMap.get(countData.salesZoneId);
      if (zone) {
        if (countData.paymentClearance === true) {
          zone.paymentCleared = countData._count.id;
        } else {
          zone.paymentPending = countData._count.id;
        }
      }
    }

    return Array.from(resultsMap.values());
  }
}