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
import { AdminStatusByCustomerDto, AdminPaymentByCustomerDto } from './dto/admin-customer-metrics.dto';

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
      const { startOfDay: prevStart, endOfDay: prevEnd } = getDayBoundariesIST(previousDay);

      const dateFilter = { createdAt: { gte: startOfDay, lt: endOfDay } };
      const prevDateFilter = { createdAt: { gte: prevStart, lt: prevEnd } };

      const dispatchFilter = { 
        status: 'Dispatched', 
        statusStepper: {
          some: { status: 'Dispatched', createdDateTime: { gte: startOfDay, lt: endOfDay } }
        }
      };
      const prevDispatchFilter = { 
        status: 'Dispatched', 
        statusStepper: {
          some: { status: 'Dispatched', createdDateTime: { gte: prevStart, lt: prevEnd } }
        }
      };

      const overdueFilter = { deliveryDate: { lt: startOfDay }, status: { not: 'Dispatched' } };
      const prevOverdueFilter = { deliveryDate: { lt: prevStart }, status: { not: 'Dispatched' } };

      const [
        totalSoCount, prevTotalSoCount,
        overdueCount, prevOverdueCount,
        dispatchedTotalCount, prevDispatchedCount,
      ] = await Promise.all([
        this.prisma.salesOrder.count({ where: dateFilter }),
        this.prisma.salesOrder.count({ where: prevDateFilter }),
        this.prisma.salesOrder.count({ where: overdueFilter }),
        this.prisma.salesOrder.count({ where: prevOverdueFilter }),
        this.prisma.salesOrder.count({ where: dispatchFilter }),
        this.prisma.salesOrder.count({ where: prevDispatchFilter }),
      ]);

      return {
        totalSoCount,
        totalSoCountPercentageChange: calculatePercentageChange(totalSoCount, prevTotalSoCount),
        overdueSoCount: overdueCount,
        overdueSoCountPercentageChange: calculatePercentageChange(overdueCount, prevOverdueCount),
        dispatchedSoCount: dispatchedTotalCount,
        dispatchedSoCountPercentageChange: calculatePercentageChange(dispatchedTotalCount, prevDispatchedCount),
      };
    } else {
      const now = new Date();

      const { startOfDay: todayStart } = getDayBoundariesIST(now);
      
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonthMTD = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999);

      const [totalSoCount, overdueCount, dispatchedTotalCount] = await Promise.all([
        this.prisma.salesOrder.count(),
        this.prisma.salesOrder.count({ where: { deliveryDate: { lt: todayStart }, status: { not: 'Dispatched' } } }),
        this.prisma.salesOrder.count({ where: { status: 'Dispatched' } })
      ]);

      const [currTotal, currOverdue, currDispatched] = await Promise.all([
        this.prisma.salesOrder.count({ where: { createdAt: { gte: startOfCurrentMonth } } }),
        this.prisma.salesOrder.count({ where: { deliveryDate: { lt: todayStart }, status: { not: 'Dispatched' }, createdAt: { gte: startOfCurrentMonth } } }),
        this.prisma.salesOrder.count({ where: { status: 'Dispatched', statusStepper: { some: { status: 'Dispatched', createdDateTime: { gte: startOfCurrentMonth } } } } })
      ]);

      const [prevTotal, prevOverdue, prevDispatched] = await Promise.all([
        this.prisma.salesOrder.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonthMTD } } }),
        this.prisma.salesOrder.count({ where: { deliveryDate: { lt: todayStart }, status: { not: 'Dispatched' }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonthMTD } } }),
        this.prisma.salesOrder.count({ where: { status: 'Dispatched', statusStepper: { some: { status: 'Dispatched', createdDateTime: { gte: startOfLastMonth, lte: endOfLastMonthMTD } } } } })
      ]);

      return {
        totalSoCount,
        totalSoCountPercentageChange: calculatePercentageChange(currTotal, prevTotal),
        overdueSoCount: overdueCount,
        overdueSoCountPercentageChange: calculatePercentageChange(currOverdue, prevOverdue),
        dispatchedSoCount: dispatchedTotalCount,
        dispatchedSoCountPercentageChange: calculatePercentageChange(currDispatched, prevDispatched),
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
      if (i === 0) dayLabel = `Today (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else if (i === 1) dayLabel = `Yesterday (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else dayLabel = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
      
      if (i === 0) dayLabel = `Today (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else if (i === 1) dayLabel = `Tomorrow (${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      else dayLabel = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

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
              some: { status: 'Ready for Dispatch', createdDateTime: { not: null } }
            }
          },
        }),
        this.prisma.sO_Status_Stepper.count({
          where: {
            status: 'Dispatched',
            createdDateTime: { gte: startOfDay, lt: endOfDay },
          },
        }),
      ]);

    return { ordersToBeDispatched, readyForDispatchToday, ordersDispatchedToday };
  }

  async getAdminOverallStatus(dateStr?: string): Promise<AdminOverallStatusDto> {
    let dateFilter: any = {};
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter = { createdAt: { gte: startOfDay, lt: endOfDay } };
    }

    const [statusCounts, totalOrders] = await Promise.all([
      this.prisma.salesOrder.groupBy({
        by: ['status'],
        _count: { id: true },
        where: dateFilter
      }),
      this.prisma.salesOrder.count({
        where: dateFilter
      }), 
    ]);

    const result: AdminOverallStatusDto = {
      totalOrders, toBeIssuedCount: 0, r105Count: 0, w105Count: 0, f105Count: 0, dispatchedCount: 0,
    };

    for (const group of statusCounts) {
      if (group.status === null) result.toBeIssuedCount = group._count.id; 
      else {
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

  async getAdminStatusByZone(dateStr?: string): Promise<AdminStatusByZoneDto[]> {
    let dateFilter: any = {};
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter = { createdAt: { gte: startOfDay, lt: endOfDay } };
    }

    const allZones = await this.prisma.salesZone.findMany({ select: { id: true, name: true } });

    const statusCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'status'],
      _count: { id: true },
      where: dateFilter
    });

    const resultsMap = new Map<number, AdminStatusByZoneDto>();
    for (const zone of allZones) {
      resultsMap.set(zone.id, {
        zoneName: zone.name, toBeIssuedCount: 0, r105Count: 0, w105Count: 0, f105Count: 0, dispatchedCount: 0,
      });
    }

    for (const group of statusCounts) {
      const zone = resultsMap.get(group.salesZoneId);
      if (zone) {
        if (group.status === null) zone.toBeIssuedCount = group._count.id; 
        else {
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

  async getAdminPaymentByZone(dateStr?: string): Promise<AdminPaymentByZoneDto[]> {
    let dateFilter: any = {};
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter = { createdAt: { gte: startOfDay, lt: endOfDay } };
    }

    const allZones = await this.prisma.salesZone.findMany({ select: { id: true, name: true } });

    const paymentCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'paymentClearance'],
      _count: { id: true },
      where: dateFilter
    });

    const resultsMap = new Map<number, AdminPaymentByZoneDto>();
    for (const zone of allZones) {
      resultsMap.set(zone.id, { zoneName: zone.name, paymentCleared: 0, paymentPending: 0 });
    }

    for (const group of paymentCounts) {
      const zone = resultsMap.get(group.salesZoneId);
      if (zone) {
        if (group.paymentClearance === true) zone.paymentCleared = group._count.id;
        else zone.paymentPending = group._count.id;
      }
    }

    return Array.from(resultsMap.values());
  }

  async getAdminOrdersByProduct(): Promise<AdminCountByEntityDto[]> {
    const counts = await this.prisma.salesOrder.groupBy({
      by: ['productId'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 5, 
    });

    const productIds = counts.map((c) => c.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } }, select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return counts.map((group) => ({
      name: productMap.get(group.productId) || 'Unknown Product', count: group._count.id,
    }));
  }

  async getAdminOrdersByCustomer(): Promise<AdminCountByEntityDto[]> {
    const counts = await this.prisma.salesOrder.groupBy({
      by: ['customerId'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 5, 
    });

    const customerIds = counts.map((c) => c.customerId).filter(Boolean) as number[];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } }, select: { id: true, name: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    return counts.map((group) => ({
      name: group.customerId ? customerMap.get(group.customerId) || 'Unknown Customer' : 'No Customer',
      count: group._count.id,
    }));
  }

  async getSalesKpis(userId: number): Promise<SalesKpiDto> {
    const [
      totalSoCount, dispatchedSoCount, r105Count, w105Count, f105Count, toBeIssuedCount, 
    ] = await this.prisma.$transaction([
      this.prisma.salesOrder.count({ where: { userId: userId } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: 'Dispatched' } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: 'R105' } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: 'W105' } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: 'F105' } }),
      this.prisma.salesOrder.count({ where: { userId: userId, status: null } }), 
    ]);

    return { totalSoCount, dispatchedSoCount, r105Count, w105Count, f105Count, toBeIssuedCount };
  }

  async getSalesRecentActivity(userId: number): Promise<SalesActivityDto[]> {
    const userOrders = await this.prisma.salesOrder.findMany({
      where: { userId: userId }, select: { saleOrderNumber: true },
    });
    if (userOrders.length === 0) return [];
    
    const userSoNumbers = userOrders.map((o) => o.saleOrderNumber);

    const latestActivityGroups = await this.prisma.sO_Status_Stepper.groupBy({
      by: ['salesOrderNumber'],
      _max: { createdDateTime: true },
      where: { salesOrderNumber: { in: userSoNumbers }, createdDateTime: { not: null } },
      orderBy: { _max: { createdDateTime: 'desc' } },
      take: 5,
    });

    if (latestActivityGroups.length === 0) return [];

    const whereConditions = latestActivityGroups.map((group) => ({
      salesOrderNumber: group.salesOrderNumber, createdDateTime: group._max.createdDateTime!,
    }));

    const activities = await this.prisma.sO_Status_Stepper.findMany({
      where: { OR: whereConditions },
      select: { salesOrderNumber: true, status: true, createdDateTime: true },
      orderBy: { createdDateTime: 'desc' },
    });

    return activities.map((act) => ({
      salesOrderNumber: act.salesOrderNumber, status: act.status, activityTimestamp: act.createdDateTime!,
    }));
  }

  async getSalesPaymentClearanceByZone(userId: number): Promise<SalesPaymentClearanceDto[]> {
    const rawCounts = await this.prisma.salesOrder.groupBy({
      by: ['salesZoneId', 'paymentClearance'],
      where: { userId: userId }, _count: { id: true },
    });

    if (rawCounts.length === 0) return [];

    const zoneIds = [...new Set(rawCounts.map((r) => r.salesZoneId))];
    const zones = await this.prisma.salesZone.findMany({
      where: { id: { in: zoneIds } }, select: { id: true, name: true },
    });

    const resultsMap = new Map<number, SalesPaymentClearanceDto>();
    for (const zone of zones) {
      resultsMap.set(zone.id, { zoneName: zone.name, paymentCleared: 0, paymentPending: 0 });
    }

    for (const countData of rawCounts) {
      const zone = resultsMap.get(countData.salesZoneId);
      if (zone) {
        if (countData.paymentClearance === true) zone.paymentCleared = countData._count.id;
        else zone.paymentPending = countData._count.id;
      }
    }

    return Array.from(resultsMap.values());
  }

  async getAdminStatusByCustomer(dateStr?: string): Promise<AdminStatusByCustomerDto[]> {
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

    const customerIds = [...new Set(statusCounts.map((g) => g.customerId as number))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } }, select: { id: true, name: true },
    });

    const resultsMap = new Map<number, AdminStatusByCustomerDto>();
    for (const customer of customers) {
      resultsMap.set(customer.id, {
        customerName: customer.name, toBeIssuedCount: 0, r105Count: 0, w105Count: 0, f105Count: 0, dispatchedCount: 0,
      });
    }

    for (const group of statusCounts) {
      const cust = resultsMap.get(group.customerId as number);
      if (cust) {
        if (group.status === null) cust.toBeIssuedCount = group._count.id;
        else {
          switch (group.status) {
            case 'R105': cust.r105Count = group._count.id; break;
            case 'W105': cust.w105Count = group._count.id; break;
            case 'F105': cust.f105Count = group._count.id; break;
            case 'Dispatched': cust.dispatchedCount = group._count.id; break;
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
  return Array.from(resultsMap.values())
      .sort((a, b) => a.customerName.localeCompare(b.customerName));
  }

  async getAdminPaymentByCustomer(dateStr?: string): Promise<AdminPaymentByCustomerDto[]> {
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

    const customerIds = [...new Set(paymentCounts.map((g) => g.customerId as number))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } }, select: { id: true, name: true },
    });

    const resultsMap = new Map<number, AdminPaymentByCustomerDto>();
    for (const customer of customers) {
      resultsMap.set(customer.id, { customerName: customer.name, paymentCleared: 0, paymentPending: 0 });
    }

    for (const group of paymentCounts) {
      const cust = resultsMap.get(group.customerId as number);
      if (cust) {
        if (group.paymentClearance === true) cust.paymentCleared = group._count.id;
        else cust.paymentPending = group._count.id;
      }
    }

  //   return Array.from(resultsMap.values())
  //     .sort((a, b) => (b.paymentCleared + b.paymentPending) - (a.paymentCleared + a.paymentPending));
  // }
  return Array.from(resultsMap.values())
      .sort((a, b) => a.customerName.localeCompare(b.customerName));
  }

  async getOperatorStats(dateStr?: string) {
    let dateFilter: any = {};
    if (dateStr) {
      const { startOfDay, endOfDay } = getDayBoundariesIST(new Date(dateStr));
      dateFilter = { UpdatedDate: { gte: startOfDay, lt: endOfDay } };
    }

    const operators = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true },
    });

    const orders = await this.prisma.salesOrder.findMany({
      where: {
        ...dateFilter,
        assignedUserId: { not: null },
      },
      select: { assignedUserId: true, status: true },
    });

    const stats = operators.map((op) => {
      const opOrders = orders.filter((o) => o.assignedUserId === op.id);
      
      let issueAssigned = 0;
      let issueCompleted = 0;
      let packingAssigned = 0;
      let packingCompleted = 0;

      opOrders.forEach((o) => {
        const s = o.status || '';
        
        const isPastIssue = ['W105', 'F105', 'Packed', 'WIP Storage', 'Ready for Dispatch', 'Dispatched'].includes(s);
        const isPastPacking = ['F105', 'Packed', 'WIP Storage', 'Ready for Dispatch', 'Dispatched'].includes(s);

        issueAssigned++;

        if (isPastIssue) {
          issueCompleted++;
          packingAssigned++; 
        }

        if (isPastPacking) {
          packingCompleted++;
        }
      });

      return {
        operatorName: op.name,
        issueAssigned,
        issueCompleted,
        packingAssigned,
        packingCompleted,
      };
    });

    stats.sort((a, b) => b.issueAssigned - a.issueAssigned);

    return { success: true, data: stats };
  }
}