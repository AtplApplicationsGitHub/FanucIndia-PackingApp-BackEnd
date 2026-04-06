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
import {
  AdminStatusByCustomerDto,
  AdminPaymentByCustomerDto,
} from './dto/admin-customer-metrics.dto';

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100.0 : 0.0;
  }
  const change = ((current - previous) / previous) * 100;
  return parseFloat(change.toFixed(1));
}

function getDayBoundariesIST(date: Date) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS);
  const endOfDay = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - IST_OFFSET_MS);

  return { startOfDay, endOfDay };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminKpis(dateStr?: string): Promise<AdminKpiDto> {
    if (dateStr) {
      const targetDate = new Date(dateStr);
      const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);

      const previousDay = new Date(targetDate);
      previousDay.setDate(previousDay.getDate() - 1);
      const { startOfDay: prevStart, endOfDay: prevEnd } =
        getDayBoundariesIST(previousDay);

      const dateFilter = { createdAt: { gte: startOfDay, lt: endOfDay } };
      const prevDateFilter = { createdAt: { gte: prevStart, lt: prevEnd } };

      const dispatchFilter = {
        status: 'Dispatched',
        statusStepper: {
          some: {
            status: 'Dispatched',
            createdDateTime: { gte: startOfDay, lt: endOfDay },
          },
        },
      };
      // Archival approximation for date-filtered dispatch
      const archiveDispatchFilter = {
        status: 'Dispatched',
        UpdatedDate: { gte: startOfDay, lt: endOfDay },
      };

      const prevDispatchFilter = {
        status: 'Dispatched',
        statusStepper: {
          some: {
            status: 'Dispatched',
            createdDateTime: { gte: prevStart, lt: prevEnd },
          },
        },
      };
      const archivePrevDispatchFilter = {
        status: 'Dispatched',
        UpdatedDate: { gte: prevStart, lt: prevEnd },
      };

      const overdueFilter = {
        deliveryDate: { lt: startOfDay },
        status: { not: 'Dispatched' },
      };
      const prevOverdueFilter = {
        deliveryDate: { lt: prevStart },
        status: { not: 'Dispatched' },
      };

      const [
        activeTotal,
        prevActiveTotal,
        activeOverdue,
        prevActiveOverdue,
        activeDispatched,
        prevActiveDispatched,
        // Archival counts
        archivedTotal,
        prevArchivedTotal,
        archivedOverdue,
        prevArchivedOverdue,
        archivedDispatched,
        prevArchivedDispatched,
      ] = await Promise.all([
        this.prisma.salesOrder.count({ where: dateFilter }),
        this.prisma.salesOrder.count({ where: prevDateFilter }),
        this.prisma.salesOrder.count({ where: overdueFilter }),
        this.prisma.salesOrder.count({ where: prevOverdueFilter }),
        this.prisma.salesOrder.count({ where: dispatchFilter }),
        this.prisma.salesOrder.count({ where: prevDispatchFilter }),

        this.prisma.salesOrderArchive.count({ where: dateFilter }),
        this.prisma.salesOrderArchive.count({ where: prevDateFilter }),
        this.prisma.salesOrderArchive.count({ where: overdueFilter }),
        this.prisma.salesOrderArchive.count({ where: prevOverdueFilter }),
        this.prisma.salesOrderArchive.count({ where: archiveDispatchFilter }),
        this.prisma.salesOrderArchive.count({
          where: archivePrevDispatchFilter,
        }),
      ]);

      const totalSoCount = activeTotal + archivedTotal;
      const prevTotalSoCount = prevActiveTotal + prevArchivedTotal;
      const overdueCount = activeOverdue + archivedOverdue;
      const prevOverdueCount = prevActiveOverdue + prevArchivedOverdue;
      const dispatchedTotalCount = activeDispatched + archivedDispatched;
      const prevDispatchedCount = prevActiveDispatched + prevArchivedDispatched;

      return {
        totalSoCount,
        totalSoCountPercentageChange: calculatePercentageChange(
          totalSoCount,
          prevTotalSoCount,
        ),
        overdueSoCount: overdueCount,
        overdueSoCountPercentageChange: calculatePercentageChange(
          overdueCount,
          prevOverdueCount,
        ),
        dispatchedSoCount: dispatchedTotalCount,
        dispatchedSoCountPercentageChange: calculatePercentageChange(
          dispatchedTotalCount,
          prevDispatchedCount,
        ),
      };
    } else {
      const now = new Date();
      const { startOfDay: todayStart } = getDayBoundariesIST(now);
      const startOfCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const endOfLastMonthMTD = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate(),
        23,
        59,
        59,
        999,
      );

      // 1. ALL TIME TOTALS (Active + Archive)
      const [
        activeTotal,
        activeOverdue,
        activeDispatched,
        archivedTotal,
        archivedOverdue,
        archivedDispatched,
      ] = await Promise.all([
        this.prisma.salesOrder.count(),
        this.prisma.salesOrder.count({
          where: {
            deliveryDate: { lt: todayStart },
            status: { not: 'Dispatched' },
          },
        }),
        this.prisma.salesOrder.count({ where: { status: 'Dispatched' } }),

        this.prisma.salesOrderArchive.count(),
        this.prisma.salesOrderArchive.count({
          where: {
            deliveryDate: { lt: todayStart },
            status: { not: 'Dispatched' },
          },
        }),
        this.prisma.salesOrderArchive.count({
          where: { status: 'Dispatched' },
        }),
      ]);

      const totalSoCount = activeTotal + archivedTotal;
      const overdueCount = activeOverdue + archivedOverdue;
      const dispatchedTotalCount = activeDispatched + archivedDispatched;

      // 2. CURRENT MONTH TO DATE (Active + Archive)
      const [
        activeCurrTotal,
        activeCurrOverdue,
        activeCurrDispatched,
        archivedCurrTotal,
        archivedCurrOverdue,
        archivedCurrDispatched,
      ] = await Promise.all([
        this.prisma.salesOrder.count({
          where: { createdAt: { gte: startOfCurrentMonth } },
        }),
        this.prisma.salesOrder.count({
          where: {
            deliveryDate: { lt: todayStart },
            status: { not: 'Dispatched' },
            createdAt: { gte: startOfCurrentMonth },
          },
        }),
        this.prisma.salesOrder.count({
          where: {
            status: 'Dispatched',
            statusStepper: {
              some: {
                status: 'Dispatched',
                createdDateTime: { gte: startOfCurrentMonth },
              },
            },
          },
        }),

        this.prisma.salesOrderArchive.count({
          where: { createdAt: { gte: startOfCurrentMonth } },
        }),
        this.prisma.salesOrderArchive.count({
          where: {
            deliveryDate: { lt: todayStart },
            status: { not: 'Dispatched' },
            createdAt: { gte: startOfCurrentMonth },
          },
        }),
        this.prisma.salesOrderArchive.count({
          where: {
            status: 'Dispatched',
            UpdatedDate: { gte: startOfCurrentMonth },
          },
        }),
      ]);

      const currTotal = activeCurrTotal + archivedCurrTotal;
      const currOverdue = activeCurrOverdue + archivedCurrOverdue;
      const currDispatched = activeCurrDispatched + archivedCurrDispatched;

      // 3. PREVIOUS MONTH TO DATE (Active + Archive)
      const [
        activePrevTotal,
        activePrevOverdue,
        activePrevDispatched,
        archivedPrevTotal,
        archivedPrevOverdue,
        archivedPrevDispatched,
      ] = await Promise.all([
        this.prisma.salesOrder.count({
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonthMTD },
          },
        }),
        this.prisma.salesOrder.count({
          where: {
            deliveryDate: { lt: todayStart },
            status: { not: 'Dispatched' },
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonthMTD },
          },
        }),
        this.prisma.salesOrder.count({
          where: {
            status: 'Dispatched',
            statusStepper: {
              some: {
                status: 'Dispatched',
                createdDateTime: {
                  gte: startOfLastMonth,
                  lte: endOfLastMonthMTD,
                },
              },
            },
          },
        }),

        this.prisma.salesOrderArchive.count({
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonthMTD },
          },
        }),
        this.prisma.salesOrderArchive.count({
          where: {
            deliveryDate: { lt: todayStart },
            status: { not: 'Dispatched' },
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonthMTD },
          },
        }),
        this.prisma.salesOrderArchive.count({
          where: {
            status: 'Dispatched',
            UpdatedDate: { gte: startOfLastMonth, lte: endOfLastMonthMTD },
          },
        }),
      ]);

      const prevTotal = activePrevTotal + archivedPrevTotal;
      const prevOverdue = activePrevOverdue + archivedPrevOverdue;
      const prevDispatched = activePrevDispatched + archivedPrevDispatched;

      return {
        totalSoCount,
        totalSoCountPercentageChange: calculatePercentageChange(
          currTotal,
          prevTotal,
        ),
        overdueSoCount: overdueCount,
        overdueSoCountPercentageChange: calculatePercentageChange(
          currOverdue,
          prevOverdue,
        ),
        dispatchedSoCount: dispatchedTotalCount,
        dispatchedSoCountPercentageChange: calculatePercentageChange(
          currDispatched,
          prevDispatched,
        ),
      };
    }
  }

  async getAdminNewImports(): Promise<AdminNewImportDto[]> {
    const results: AdminNewImportDto[] = [];
    const today = new Date();

    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);

      const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);

      const count = await this.prisma.salesOrder.count({
        where: { createdAt: { gte: startOfDay, lt: endOfDay } },
      });

      const formattedDate = targetDate.toISOString().split('T')[0];
      let dayLabel: string;
      if (i === 0)
        dayLabel = `Today (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else if (i === 1)
        dayLabel = `Yesterday (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else
        dayLabel = targetDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

      results.push({ dayLabel, date: formattedDate, count });
    }
    return results;
  }

  async getAdminUpcomingOrders(): Promise<AdminNewImportDto[]> {
    const results: AdminNewImportDto[] = [];
    const today = new Date();

    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);

      const count = await this.prisma.salesOrder.count({
        where: {
          deliveryDate: { gte: startOfDay, lt: endOfDay },
          OR: [{ status: null }, { status: { not: 'Dispatched' } }],
        },
      });

      const formattedDate = targetDate.toISOString().split('T')[0];
      let dayLabel: string;

      if (i === 0)
        dayLabel = `Today (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else if (i === 1)
        dayLabel = `Tomorrow (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else
        dayLabel = targetDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        });

      results.push({ dayLabel, date: formattedDate, count });
    }
    return results;
  }

  async getAdminDispatchSummary(): Promise<AdminDispatchSummaryDto> {
    const { startOfDay, endOfDay } = getDayBoundariesIST(new Date());

    const [ordersToBeDispatched, readyForDispatchToday, ordersDispatchedToday] =
      await this.prisma.$transaction([
        this.prisma.salesOrder.count({
          where: {
            deliveryDate: { gte: startOfDay, lt: endOfDay },
            OR: [{ status: null }, { status: { not: 'Dispatched' } }],
          },
        }),
        this.prisma.salesOrder.count({
          where: {
            deliveryDate: { gte: startOfDay, lt: endOfDay },
            status: { not: 'Dispatched' },
            statusStepper: {
              some: {
                status: 'Ready for Dispatch',
                createdDateTime: { not: null },
              },
            },
          },
        }),
        this.prisma.sO_Status_Stepper.count({
          where: {
            status: 'Dispatched',
            createdDateTime: { gte: startOfDay, lt: endOfDay },
          },
        }),
      ]);

    return {
      ordersToBeDispatched,
      readyForDispatchToday,
      ordersDispatchedToday,
    };
  }

  async getAdminOverallStatus(
    dateStr?: string,
  ): Promise<AdminOverallStatusDto> {
    let dateFilter: any = {};
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter = { createdAt: { gte: startOfDay, lt: endOfDay } };
    }

    const [statusCounts, totalOrders] = await Promise.all([
      this.prisma.salesOrder.groupBy({
        by: ['status'],
        _count: { id: true },
        where: dateFilter,
      }),
      this.prisma.salesOrder.count({
        where: dateFilter,
      }),
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
      if (group.status === null) result.toBeIssuedCount = group._count.id;
      else {
        switch (group.status) {
          case 'R105':
            result.r105Count = group._count.id;
            break;
          case 'W105':
            result.w105Count = group._count.id;
            break;
          case 'F105':
            result.f105Count = group._count.id;
            break;
          case 'Dispatched':
            result.dispatchedCount = group._count.id;
            break;
        }
      }
    }
    return result;
  }

  async getAdminStatusByZone(
    dateStr?: string,
  ): Promise<AdminStatusByZoneDto[]> {
    let dateFilter: any = {};
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter = { createdAt: { gte: startOfDay, lt: endOfDay } };
    }

    const allZones = await this.prisma.salesZone.findMany({
      select: { id: true, name: true },
    });

    const statusCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'status'],
      _count: { id: true },
      where: dateFilter,
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
        if (group.status === null) zone.toBeIssuedCount = group._count.id;
        else {
          switch (group.status) {
            case 'R105':
              zone.r105Count = group._count.id;
              break;
            case 'W105':
              zone.w105Count = group._count.id;
              break;
            case 'F105':
              zone.f105Count = group._count.id;
              break;
            case 'Dispatched':
              zone.dispatchedCount = group._count.id;
              break;
          }
        }
      }
    }

    return Array.from(resultsMap.values());
  }

  async getAdminPaymentByZone(
    dateStr?: string,
  ): Promise<AdminPaymentByZoneDto[]> {
    let dateFilter: any = {};
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter = { createdAt: { gte: startOfDay, lt: endOfDay } };
    }

    const allZones = await this.prisma.salesZone.findMany({
      select: { id: true, name: true },
    });

    const paymentCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'paymentClearance'],
      _count: { id: true },
      where: dateFilter,
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
        if (group.paymentClearance === true)
          zone.paymentCleared = group._count.id;
        else zone.paymentPending = group._count.id;
      }
    }

    return Array.from(resultsMap.values());
  }

  async getAdminOrdersByProduct(): Promise<AdminCountByEntityDto[]> {
    const counts = await this.prisma.salesOrder.groupBy({
      by: ['productId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
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
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const customerIds = counts
      .map((c) => c.customerId)
      .filter(Boolean) as number[];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    return counts.map((group) => ({
      name: group.customerId
        ? customerMap.get(group.customerId) || 'Unknown Customer'
        : 'No Customer',
      count: group._count.id,
    }));
  }

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
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'Dispatched' },
      }),
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'R105' },
      }),
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'W105' },
      }),
      this.prisma.salesOrder.count({
        where: { userId: userId, status: 'F105' },
      }),
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
    if (userOrders.length === 0) return [];

    const userSoNumbers = userOrders.map((o) => o.saleOrderNumber);

    const latestActivityGroups = await this.prisma.sO_Status_Stepper.groupBy({
      by: ['salesOrderNumber'],
      _max: { createdDateTime: true },
      where: {
        salesOrderNumber: { in: userSoNumbers },
        createdDateTime: { not: null },
      },
      orderBy: { _max: { createdDateTime: 'desc' } },
      take: 5,
    });

    if (latestActivityGroups.length === 0) return [];

    const whereConditions = latestActivityGroups.map((group) => ({
      salesOrderNumber: group.salesOrderNumber,
      createdDateTime: group._max.createdDateTime!,
    }));

    const activities = await this.prisma.sO_Status_Stepper.findMany({
      where: { OR: whereConditions },
      select: { salesOrderNumber: true, status: true, createdDateTime: true },
      orderBy: { createdDateTime: 'desc' },
    });

    return activities.map((act) => ({
      salesOrderNumber: act.salesOrderNumber,
      status: act.status,
      activityTimestamp: act.createdDateTime!,
    }));
  }

  // Helper to get user's zone
  private async getUserZoneId(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.salesZoneId || 0;
  }

  // Row 1: Sales Dispatch Summary
  async getSalesDispatchSummary(userId: number, dateStr?: string) {
    const zoneId = await this.getUserZoneId(userId);
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);

    const [ordersToBeDispatched, readyForDispatchToday, ordersDispatchedToday] =
      await this.prisma.$transaction([
        this.prisma.salesOrder.count({
          where: {
            salesZoneId: zoneId,
            deliveryDate: { gte: startOfDay, lt: endOfDay },
          },
        }),
        this.prisma.salesOrder.count({
          where: {
            salesZoneId: zoneId,
            deliveryDate: { gte: startOfDay, lt: endOfDay },
            status: { not: 'Dispatched' },
            statusStepper: {
              some: {
                status: 'Ready for Dispatch',
                createdDateTime: { not: null },
              },
            },
          },
        }),
        this.prisma.salesOrder.count({
          where: {
            salesZoneId: zoneId,
            deliveryDate: { gte: startOfDay, lt: endOfDay },
            OR: [{ status: null }, { status: { not: 'Dispatched' } }],
          },
        }),
      ]);

    return {
      ordersToBeDispatched,
      readyForDispatchToday,
      ordersDispatchedToday,
    };
  }

  // Row 2: Sales Orders Created (Imports)
  async getSalesNewImports(userId: number): Promise<AdminNewImportDto[]> {
    const zoneId = await this.getUserZoneId(userId);
    const results: AdminNewImportDto[] = [];
    const today = new Date();

    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);

      const count = await this.prisma.salesOrder.count({
        where: {
          salesZoneId: zoneId,
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
      });

      const formattedDate = targetDate.toISOString().split('T')[0];
      let dayLabel =
        i === 0
          ? `Today (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
          : i === 1
            ? `Yesterday (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
            : targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
      results.push({ dayLabel, date: formattedDate, count });
    }
    return results;
  }

  // Row 2: Sales Upcoming Orders
  async getSalesUpcomingOrders(userId: number): Promise<AdminNewImportDto[]> {
    const zoneId = await this.getUserZoneId(userId);
    const results: AdminNewImportDto[] = [];
    const today = new Date();

    for (let i = 0; i < 5; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);

      const count = await this.prisma.salesOrder.count({
        where: {
          salesZoneId: zoneId,
          deliveryDate: { gte: startOfDay, lt: endOfDay },
          OR: [{ status: null }, { status: { not: 'Dispatched' } }],
        },
      });

      const formattedDate = targetDate.toISOString().split('T')[0];
      let dayLabel =
        i === 0
          ? `Today (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
          : i === 1
            ? `Tomorrow (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
            : targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              });
      results.push({ dayLabel, date: formattedDate, count });
    }
    return results;
  }

  // Row 2: Sales Overall Status (For Order Status Distribution)
  async getSalesOverallStatus(
    userId: number,
    dateStr?: string,
  ): Promise<AdminOverallStatusDto> {
    const zoneId = await this.getUserZoneId(userId);
    let dateFilter: any = { salesZoneId: zoneId };
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter.createdAt = { gte: startOfDay, lt: endOfDay };
    }

    const [statusCounts, totalOrders] = await Promise.all([
      this.prisma.salesOrder.groupBy({
        by: ['status'],
        _count: { id: true },
        where: dateFilter,
      }),
      this.prisma.salesOrder.count({ where: dateFilter }),
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
      if (group.status === null) result.toBeIssuedCount = group._count.id;
      else {
        switch (group.status) {
          case 'R105':
            result.r105Count = group._count.id;
            break;
          case 'W105':
            result.w105Count = group._count.id;
            break;
          case 'F105':
            result.f105Count = group._count.id;
            break;
          case 'Dispatched':
            result.dispatchedCount = group._count.id;
            break;
        }
      }
    }
    return result;
  }

  // Row 3: Update existing method to filter by Date
  async getSalesPaymentClearanceByZone(
    userId: number,
    dateStr?: string,
  ): Promise<SalesPaymentClearanceDto[]> {
    const zoneId = await this.getUserZoneId(userId);
    let dateFilter: any = { salesZoneId: zoneId };
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter.createdAt = { gte: startOfDay, lt: endOfDay };
    }

    const rawCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'paymentClearance'],
      where: dateFilter,
      _count: { id: true },
    });

    const zone = await this.prisma.salesZone.findUnique({
      where: { id: zoneId },
    });
    if (!zone) return [];
    const result = {
      zoneName: zone.name,
      paymentCleared: 0,
      paymentPending: 0,
    };

    for (const countData of rawCounts) {
      if (countData.paymentClearance === true)
        result.paymentCleared = countData._count.id;
      else result.paymentPending = countData._count.id;
    }
    return [result];
  }

  async getAdminStatusByCustomer(
    dateStr?: string,
  ): Promise<AdminStatusByCustomerDto[]> {
    let dateFilter: any = { customerId: { not: null } };
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter.createdAt = { gte: startOfDay, lt: endOfDay };
    }

    const statusCounts = await this.prisma.salesOrder.groupBy({
      by: ['customerId', 'status'],
      _count: { id: true },
      where: dateFilter,
    });

    const customerIds = [
      ...new Set(statusCounts.map((g) => g.customerId as number)),
    ];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    });

    const resultsMap = new Map<number, AdminStatusByCustomerDto>();
    for (const customer of customers) {
      resultsMap.set(customer.id, {
        customerName: customer.name,
        toBeIssuedCount: 0,
        r105Count: 0,
        w105Count: 0,
        f105Count: 0,
        dispatchedCount: 0,
      });
    }

    for (const group of statusCounts) {
      const cust = resultsMap.get(group.customerId as number);
      if (cust) {
        if (group.status === null) cust.toBeIssuedCount = group._count.id;
        else {
          switch (group.status) {
            case 'R105':
              cust.r105Count = group._count.id;
              break;
            case 'W105':
              cust.w105Count = group._count.id;
              break;
            case 'F105':
              cust.f105Count = group._count.id;
              break;
            case 'Dispatched':
              cust.dispatchedCount = group._count.id;
              break;
          }
        }
      }
    }

    //   return Array.from(resultsMap.values())
    //     .sort((a, b) => {
    //       const totalA = a.toBeIssuedCount + a.r105Count + a.w105Count + a.f105Count + a.dispatchedCount;
    //       const totalB = b.toBeIssuedCount + b.r105Count + b.w105Count + b.f105Count + b.dispatchedCount;
    //       return totalB - totalA;
    //     });
    // }
    return Array.from(resultsMap.values()).sort((a, b) =>
      a.customerName.localeCompare(b.customerName),
    );
  }

  async getAdminPaymentByCustomer(
    dateStr?: string,
  ): Promise<AdminPaymentByCustomerDto[]> {
    let dateFilter: any = { customerId: { not: null } };
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter.createdAt = { gte: startOfDay, lt: endOfDay };
    }

    const paymentCounts = await this.prisma.salesOrder.groupBy({
      by: ['customerId', 'paymentClearance'],
      _count: { id: true },
      where: dateFilter,
    });

    const customerIds = [
      ...new Set(paymentCounts.map((g) => g.customerId as number)),
    ];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    });

    const resultsMap = new Map<number, AdminPaymentByCustomerDto>();
    for (const customer of customers) {
      resultsMap.set(customer.id, {
        customerName: customer.name,
        paymentCleared: 0,
        paymentPending: 0,
      });
    }

    for (const group of paymentCounts) {
      const cust = resultsMap.get(group.customerId as number);
      if (cust) {
        if (group.paymentClearance === true)
          cust.paymentCleared = group._count.id;
        else cust.paymentPending = group._count.id;
      }
    }

    //   return Array.from(resultsMap.values())
    //     .sort((a, b) => (b.paymentCleared + b.paymentPending) - (a.paymentCleared + a.paymentPending));
    // }
    return Array.from(resultsMap.values()).sort((a, b) =>
      a.customerName.localeCompare(b.customerName),
    );
  }

  async getOperatorStats(dateStr?: string) {
    const operators = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true },
    });

    const stats = operators.map((op) => ({
      operatorId: op.id,
      operatorName: op.name,
      operatorEmail: op.email,
      issueAssigned: [] as any[],
      issueCompleted: [] as any[],
      packingAssigned: [] as any[],
      packingCompleted: [] as any[],
    }));

    const addOrder = (array: any[], orderData: any) => {
      if (!array.find((o) => o.saleOrderNumber === orderData.saleOrderNumber)) {
        array.push({
          saleOrderNumber: orderData.saleOrderNumber,
          outboundDelivery: orderData.outboundDelivery || '-',
        });
      }
    };

    const issueCompletedStatuses = [
      'W105',
      'F105',
      'Packed',
      'WIP Storage',
      'Ready for Dispatch',
      'Dispatched',
    ];
    const packingCompletedStatuses = [
      'F105',
      'Packed',
      'WIP Storage',
      'Ready for Dispatch',
      'Dispatched',
    ];

    if (!dateStr) {
      const orders = await this.prisma.salesOrder.findMany({
        where: {
          OR: [
            { issueAssignedUserId: { not: null } },
            { packingAssignedUserId: { not: null } },
          ],
        },
        select: {
          issueAssignedUserId: true,
          packingAssignedUserId: true,
          status: true,
          saleOrderNumber: true,
          outboundDelivery: true,
        },
      });

      orders.forEach((o) => {
        const s = o.status || '';
        const isPastIssue = issueCompletedStatuses.includes(s);
        const isPastPacking = packingCompletedStatuses.includes(s);

        if (o.issueAssignedUserId) {
          const stat = stats.find(
            (s) => s.operatorId === o.issueAssignedUserId,
          );
          if (stat) {
            addOrder(stat.issueAssigned, o);
            if (isPastIssue) addOrder(stat.issueCompleted, o);
          }
        }

        if (o.packingAssignedUserId) {
          const stat = stats.find(
            (s) => s.operatorId === o.packingAssignedUserId,
          );
          if (stat) {
            addOrder(stat.packingAssigned, o);
            if (isPastPacking) addOrder(stat.packingCompleted, o);
          }
        }
      });
    } else {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));

      const stepperAssignmentsToday =
        await this.prisma.sO_Status_Stepper.findMany({
          where: {
            createdDateTime: { gte: startOfDay, lt: endOfDay },
            status: { in: ['Under Issue', 'Under Packing'] },
          },
          select: {
            status: true,
            salesOrderNumber: true,
            salesOrder: {
              select: {
                outboundDelivery: true,
                issueAssignedUserId: true,
                packingAssignedUserId: true,
              },
            },
          },
        });

      stepperAssignmentsToday.forEach((st) => {
        const orderData = {
          saleOrderNumber: st.salesOrderNumber,
          outboundDelivery: st.salesOrder?.outboundDelivery,
        };
        if (st.status === 'Under Issue' && st.salesOrder?.issueAssignedUserId) {
          const stat = stats.find(
            (s) => s.operatorId === st.salesOrder.issueAssignedUserId,
          );
          if (stat) addOrder(stat.issueAssigned, orderData);
        }
        if (
          st.status === 'Under Packing' &&
          st.salesOrder?.packingAssignedUserId
        ) {
          const stat = stats.find(
            (s) => s.operatorId === st.salesOrder.packingAssignedUserId,
          );
          if (stat) addOrder(stat.packingAssigned, orderData);
        }
      });

      const steppersCompletionsToday =
        await this.prisma.sO_Status_Stepper.findMany({
          where: {
            createdDateTime: { gte: startOfDay, lt: endOfDay },
            status: { in: ['Issued', 'Packed'] },
          },
          select: {
            status: true,
            salesOrderNumber: true,
            salesOrder: {
              select: {
                outboundDelivery: true,
                issueAssignedUserId: true,
                packingAssignedUserId: true,
              },
            },
          },
        });

      steppersCompletionsToday.forEach((st) => {
        const orderData = {
          saleOrderNumber: st.salesOrderNumber,
          outboundDelivery: st.salesOrder?.outboundDelivery,
        };
        if (st.status === 'Issued' && st.salesOrder?.issueAssignedUserId) {
          const stat = stats.find(
            (s) => s.operatorId === st.salesOrder.issueAssignedUserId,
          );
          if (stat) {
            addOrder(stat.issueCompleted, orderData);
            addOrder(stat.issueAssigned, orderData);
          }
        }
        if (st.status === 'Packed' && st.salesOrder?.packingAssignedUserId) {
          const stat = stats.find(
            (s) => s.operatorId === st.salesOrder.packingAssignedUserId,
          );
          if (stat) {
            addOrder(stat.packingCompleted, orderData);
            addOrder(stat.packingAssigned, orderData);
          }
        }
      });
    }
    const finalData = stats.map(({ operatorId, ...rest }) => ({
      ...rest,
      issueAssignedCount: rest.issueAssigned.length,
      issueCompletedCount: rest.issueCompleted.length,
      packingAssignedCount: rest.packingAssigned.length,
      packingCompletedCount: rest.packingCompleted.length,
    }));
    finalData.sort((a, b) => b.issueAssignedCount - a.issueAssignedCount);

    return { success: true, data: finalData };
  }
}
