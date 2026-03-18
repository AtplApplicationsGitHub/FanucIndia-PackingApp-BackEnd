import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReportsSalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesOrderReportsAnalysis(filters: any) {
    const where: any = {};

    if (filters.date) {
      const gte = new Date(filters.date);
      const lt = new Date(filters.date);
      lt.setDate(lt.getDate() + 1);
      
      where.createdAt = {
        gte,
        lt,
      };
    } else if (filters.startDate || filters.endDate) {
      const gte = filters.startDate ? new Date(filters.startDate) : undefined;
      const lt = filters.endDate ? new Date(filters.endDate) : undefined;

      where.createdAt = {};
      if (gte) where.createdAt.gte = gte;
      // If endDate is provided, encompass the entire day
      if (lt) {
        const nextDay = new Date(lt);
        nextDay.setDate(nextDay.getDate() + 1);
        where.createdAt.lt = nextDay;
      }
    }

    if (filters.search) {
      where.OR = [
        { saleOrderNumber: { contains: filters.search, mode: 'insensitive' } },
        { customerNameText: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    if (filters.payment) {
      const paymentVal = String(filters.payment).toLowerCase();
      if (paymentVal === 'cash' || paymentVal === 'true' || paymentVal === 'cleared') {
        where.paymentClearance = true;
      } else if (paymentVal === 'credit' || paymentVal === 'false' || paymentVal === 'pending') {
        where.paymentClearance = false;
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.salesZoneId) {
      where.salesZoneId = parseInt(filters.salesZoneId, 10);
    }

    if (filters.customerId) {
      where.customerId = parseInt(filters.customerId, 10);
    }

    // 1. Total Orders count
    const totalOrders = await this.prisma.salesOrder.count({ where });

    // 2. Orders grouped by status
    const groupStatus = await this.prisma.salesOrder.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    // 3. Orders grouped by Payment Clearance
    const groupPayment = await this.prisma.salesOrder.groupBy({
      by: ['paymentClearance'],
      where,
      _count: { id: true },
    });

    // 4. Transform data for analysis
    const analysisByStatus = groupStatus.map(g => ({
      status: g.status || 'No Status',
      count: g._count.id
    }));

    const paymentClearedCount = groupPayment.find(g => g.paymentClearance === true)?._count.id || 0;
    const paymentPendingCount = groupPayment.find(g => g.paymentClearance === false)?._count.id || 0;

    return {
      success: true,
      data: {
        totalOrders,
        analysisByStatus,
        paymentStatus: {
          Yes: paymentClearedCount,
          No: paymentPendingCount
        }
      }
    };
  }

  async getAdminOrderSummary() {
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        OR: [
          { status: null },
          { status: 'R105' },
          { status: 'W105' },
          { status: 'F105' },
          { status: 'Dispatched' },
        ],
      },
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        paymentClearance: true,
        customerNameText: true,
        status: true,
        isErpImported: true,
        fgLocation: true,
        customer: { select: { name: true } },
        salesZone: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orderIds = orders.map((o) => o.id);

    const printedEntries = await this.prisma.customerLabelPrintEntry.findMany({
      where: { salesOrderId: { in: orderIds } },
      select: { salesOrderId: true },
    });

    const printedOrderIds = new Set(printedEntries.map((e) => e.salesOrderId));

    return orders.map((order) => {
      // Create the JSON status object based on your logic rules.
      // If a later status is reached, the earlier statuses are also considered true.
      const statusObj = {
        isErpImported: order.isErpImported === 1,
        isR105: ['R105', 'W105', 'F105', 'Dispatched'].includes(order.status ?? ''),
        isW105: ['W105', 'F105', 'Dispatched'].includes(order.status ?? ''),
        isF105: ['F105', 'Dispatched'].includes(order.status ?? ''),
        isStored: order.fgLocation !== null, // True if FG Location is not null
        isCustomerLabelPrinted: printedOrderIds.has(order.id),
        isDispatched: order.status === 'Dispatched',
      };

      return {
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        customerName: order.customer?.name || order.customerNameText || 'N/A',
        salesZone: order.salesZone?.name || 'N/A',
        paymentClearance: order.paymentClearance,
        status: statusObj, // Replaces the old string output with the new JSON object
      };
    });
  }
  // CUSTOMER REPORTS 
  async getCustomerReport() {
    const grouped = await this.prisma.salesOrder.groupBy({
      by: ['customerId', 'customerNameText'],
      _count: {
        id: true,
      },
    });

    const customerIds = [
      ...new Set(
        grouped
          .filter((g) => g.customerId !== null)
          .map((g) => g.customerId as number),
      ),
    ];

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    const resultMap = new Map<string, number>();

    for (const g of grouped) {
      const name =
        (g.customerId ? customerMap.get(g.customerId) : g.customerNameText) ||
        'N/A';
      resultMap.set(name, (resultMap.get(name) || 0) + g._count.id);
    }

    const reportData = Array.from(resultMap.entries()).map(
      ([customerName, saleOrderNumberCount]) => ({
        customerName,
        saleOrderNumberCount,
      }),
    );

    // Sort by count descending
    reportData.sort((a, b) => b.saleOrderNumberCount - a.saleOrderNumberCount);

    return {
      success: true,
      data: reportData,
    };
  }

  async getCustomerReportByMaterialCode(materialCode: string) {
    if (!materialCode) {
      return { success: true, data: [] };
    }

    const salesOrders = await this.prisma.salesOrder.findMany({
      where: {
        materialData: {
          some: {
            Material_Code: {
              contains: materialCode,
              mode: 'insensitive',
            },
          },
        },
      },
      select: {
        id: true,
        customerId: true,
        customerNameText: true,
      },
    });

    const customerIds = [
      ...new Set(
        salesOrders
          .filter((so) => so.customerId !== null)
          .map((so) => so.customerId as number),
      ),
    ];

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    const resultMap = new Map<string, number>();

    for (const so of salesOrders) {
      const name =
        (so.customerId ? customerMap.get(so.customerId) : so.customerNameText) ||
        'N/A';
      resultMap.set(name, (resultMap.get(name) || 0) + 1);
    }

    const sortedData = Array.from(resultMap.entries()).map(
      ([customerName, count]) => ({
        customerName,
        count,
      }),
    );

    // Sort by count descending
    sortedData.sort((a, b) => b.count - a.count);

    // Remove the count from the final output
    const reportData = sortedData.map(item => ({
      customerName: item.customerName,
    }));

    return {
      success: true,
      data: [
        { MaterialCode: materialCode },
        ...reportData,
      ],
    };
  }

  // FG STROAGE 
  async getFgStorageReport() {
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        OR: [
          { status: { not: 'Dispatched' } },
          { status: null },
        ],
      },
      select: {
        fgLocation: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        UpdatedBy: true,
        updatedAt: true,
      },
      orderBy: {
        fgLocation: 'asc',
      },
    });

    const reportData = orders.map((order) => {
      let locationStr = 'N/A';
      if (order.fgLocation) {
        const loc = order.fgLocation as any;
        if (Array.isArray(loc)) {
          locationStr = loc.map((l: any) => String(l).trim()).join(', ');
        } else if (typeof loc === 'string') {
          locationStr = loc.trim();
        } else {
          locationStr = String(loc);
        }
      }

      return {
        fgLocation: locationStr,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        LastUpdatedBy: order.UpdatedBy || 'Unknown',
        dateTime: order.updatedAt,
      };
    });

    return {
      success: true,
      data: reportData,
    };
  }
}
