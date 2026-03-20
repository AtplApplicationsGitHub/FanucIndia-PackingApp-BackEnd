import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReportsSalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminOrderSummary(filters: any = {}) {
    const where: any = {};

    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 10;
    const skip = (page - 1) * limit;

    if (filters.date) {
      const gte = new Date(filters.date);
      const lt = new Date(filters.date);
      lt.setDate(lt.getDate() + 1);
      where.createdAt = { gte, lt };
    } else if (filters.startDate || filters.endDate) {
      const gte = filters.startDate ? new Date(filters.startDate) : undefined;
      const lt = filters.endDate ? new Date(filters.endDate) : undefined;
      where.createdAt = {};
      if (gte) where.createdAt.gte = gte;
      if (lt) {
        const nextDay = new Date(lt);
        nextDay.setDate(nextDay.getDate() + 1);
        where.createdAt.lt = nextDay;
      }
    }

    if (filters.search) {
      where.OR = [
        { saleOrderNumber: { contains: filters.search, mode: 'insensitive' } },
        { outboundDelivery: { contains: filters.search, mode: 'insensitive' } },
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
    } else {
      const baseSummaryOr = [
        { status: null },
        { status: 'R105' },
        { status: 'W105' },
        { status: 'F105' },
        { status: 'Dispatched' },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: baseSummaryOr }
        ];
        delete where.OR;
      } else {
        where.OR = baseSummaryOr;
      }
    }

    if (filters.salesZoneId) {
      where.salesZoneId = parseInt(filters.salesZoneId, 10);
    }
    if (filters.customerId) {
      where.customerId = parseInt(filters.customerId, 10);
    }

    const totalOrders = await this.prisma.salesOrder.count({ where });

    const orders = await this.prisma.salesOrder.findMany({
      where,
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        paymentClearance: true,
        customerNameText: true,
        status: true,
        isErpImported: true,
        fgLocation: true,
        createdAt: true,
        customer: { select: { name: true } },
        salesZone: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const orderIds = orders.map((o) => o.id);

    const printedEntries = await this.prisma.customerLabelPrintEntry.findMany({
      where: { salesOrderId: { in: orderIds } },
      select: { salesOrderId: true },
    });

    const printedOrderIds = new Set(printedEntries.map((e) => e.salesOrderId));

    const formattedOrders = orders.map((order) => {
      const statusObj = {
        isErpImported: order.isErpImported === 1,
        isR105: ['R105', 'W105', 'F105', 'Dispatched'].includes(order.status ?? ''),
        isW105: ['W105', 'F105', 'Dispatched'].includes(order.status ?? ''),
        isF105: ['F105', 'Dispatched'].includes(order.status ?? ''),
        isStored: order.fgLocation !== null, 
        isCustomerLabelPrinted: printedOrderIds.has(order.id),
        isDispatched: order.status === 'Dispatched',
      };

      return {
        id: order.id,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        customerName: order.customer?.name || order.customerNameText || '-',
        salesZone: order.salesZone?.name || '-',
        paymentClearance: order.paymentClearance,
        createdAt: order.createdAt,
        status: order.status || '-',
        statusObj: statusObj,
      };
    });

    return {
      success: true,
      data: {
        totalOrders,
        page,              
        limit,             
        totalPages: Math.ceil(totalOrders / limit), 
        orders: formattedOrders
      }
    };
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

  // FG STORAGE
  async getFgStorageReport(pageParam?: string, limitParam?: string) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { status: { not: 'Dispatched' } },
        { status: null },
      ],
    };

    const totalOrders = await this.prisma.salesOrder.count({ where });

    const orders = await this.prisma.salesOrder.findMany({
      where,
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
      skip,
      take: limit,
    });

    const reportData = orders.map((order) => {
      let locationStr = '-';
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
      data: {
        totalOrders,
        page,              
        limit,             
        totalPages: Math.ceil(totalOrders / limit),
        reportData
      }
    };
  }
}
