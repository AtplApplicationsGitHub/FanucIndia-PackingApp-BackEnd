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
      orderBy: [
        {
          customer: {
            name: 'asc',
          },
        },
        {
          customerNameText: 'asc',
        },
        {
          saleOrderNumber: 'asc',
        },
      ],
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

    const groupedOrdersMap = formattedOrders.reduce((acc, order) => {
      const cName = order.customerName;
      if (!acc[cName]) {
        acc[cName] = [];
      }
      acc[cName].push(order);
      return acc;
    }, {} as Record<string, typeof formattedOrders>);

    const groupedData = Object.keys(groupedOrdersMap).map((customerName) => ({
      customerName,
      orders: groupedOrdersMap[customerName],
    }));

    return {
      success: true,
      data: {
        totalOrders,
        page,              
        limit,             
        totalPages: Math.ceil(totalOrders / limit), 
        orders: formattedOrders,
        groupedOrders: groupedData,
      }
    };
  }

  // CUSTOMER REPORTS 
  async getCustomerReport(startDate?: string, endDate?: string) {
    const where: any = {};

    // Apply deliveryDate filter if startDate or endDate are provided
    if (startDate || endDate) {
      where.deliveryDate = {};
      if (startDate) {
        where.deliveryDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        // Set time to end of the day to make the filter inclusive
        end.setUTCHours(23, 59, 59, 999); 
        where.deliveryDate.lte = end;
      }
    }

    const grouped = await this.prisma.salesOrder.groupBy({
      by: ['customerId', 'customerNameText'],
      where, // Add the where clause here
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

  async getCustomerReportByMaterialCode(materialCode: string, startDate?: string, endDate?: string) {
    if (!materialCode) {
      return { success: true, data: [] };
    }

    const where: any = {
      materialData: {
        some: {
          Material_Code: {
            contains: materialCode,
            mode: 'insensitive',
          },
        },
      },
    };

    // Apply deliveryDate filter alongside the materialCode filter
    if (startDate || endDate) {
      where.deliveryDate = {};
      if (startDate) {
        where.deliveryDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        // Set time to end of the day to make the filter inclusive
        end.setUTCHours(23, 59, 59, 999);
        where.deliveryDate.lte = end;
      }
    }

    const salesOrders = await this.prisma.salesOrder.findMany({
      where, // Pass the combined where clause here
      select: {
        id: true,
        customerId: true,
        customerNameText: true,
        materialData: {
          where: {
            Material_Code: {
              contains: materialCode,
              mode: 'insensitive',
            },
          },
          select: {
            Required_Qty: true,
          },
        },
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
        '-';
      
      let orderMaterialQty = 0;
      for (const mat of so.materialData) {
        const qty = Number(mat.Required_Qty) || 0; 
        orderMaterialQty += qty;
      }

      resultMap.set(name, (resultMap.get(name) || 0) + orderMaterialQty);
    }

    const sortedData = Array.from(resultMap.entries()).map(
      ([customerName, totalQuantity]) => ({
        customerName,
        totalQuantity, 
      }),
    );

    sortedData.sort((a, b) => b.totalQuantity - a.totalQuantity);

    return {
      success: true,
      data: [
        { MaterialCode: materialCode },
        ...sortedData,
      ],
    };
  }

  // FG STORAGE
  async getFgStorageReport(pageParam?: string, limitParam?: string, search?: string) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const skip = (page - 1) * limit;

    const where: any = {
      fgLocation: { not: null }, 
      OR: [
        { status: null },
        { status: { in: ['R105', 'W105', 'F105'] } },
      ],
    };

    const allOrders = await this.prisma.salesOrder.findMany({
      where,
      select: {
        id: true,
        fgLocation: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        FGUpdatedBy: true,
        FGUpdatedDateTime: true,
      },
      orderBy: [
        { fgLocation: 'asc' },
        { id: 'asc' }
      ]
    });

    const now = new Date();

    const formattedOrders = allOrders.map((order) => {
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

      let durationDays = 0;
      if (order.FGUpdatedDateTime) {
        const diffTime = now.getTime() - new Date(order.FGUpdatedDateTime).getTime();
        durationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      }

      return {
        fgLocation: locationStr,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        LastUpdatedBy: order.FGUpdatedBy || 'Unknown',
        dateTime: order.FGUpdatedDateTime,
        durationDays: durationDays,
        durationText: `${durationDays} day(s)`
      };
    });

    let filteredOrders = formattedOrders;
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredOrders = formattedOrders.filter((o) => {
        const soMatch = o.saleOrderNumber.toLowerCase().includes(lowerSearch);
        const obdMatch = o.outboundDelivery?.toLowerCase().includes(lowerSearch);
        const locMatch = o.fgLocation.toLowerCase().includes(lowerSearch);
        
        return soMatch || obdMatch || locMatch;
      });
    }

    const totalOrders = filteredOrders.length;
    const pagedReportData = filteredOrders.slice(skip, skip + limit);

    return {
      success: true,
      data: {
        totalOrders,
        page,              
        limit,             
        totalPages: Math.ceil(totalOrders / limit),
        reportData: pagedReportData
      }
    };
  }
}
