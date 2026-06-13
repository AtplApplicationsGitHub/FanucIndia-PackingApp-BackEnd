import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  getDateOnlyRange,
  getSingleDateOnlyRange,
} from '../../common/utils/date-only.util';

@Injectable()
export class ReportsSalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  private parseReportDate(date?: string) {
    if (!date?.trim()) {
      return undefined;
    }

    const value = date.trim();
    const yyyyMmDd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const ddMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);

    let parsedDate: Date;
    if (yyyyMmDd) {
      parsedDate = new Date(
        Number(yyyyMmDd[1]),
        Number(yyyyMmDd[2]) - 1,
        Number(yyyyMmDd[3]),
      );
    } else if (ddMmYyyy) {
      parsedDate = new Date(
        Number(ddMmYyyy[3]),
        Number(ddMmYyyy[2]) - 1,
        Number(ddMmYyyy[1]),
      );
    } else {
      parsedDate = new Date(value);
    }

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD.',
      );
    }

    return parsedDate;
  }

  private getDeliveryDateFilter(fromDate?: string, toDate?: string) {
    return getDateOnlyRange(fromDate, toDate);
  }

  async getAdminOrderSummary(filters: any = {}) {
    const where: any = {};

    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 10;
    const skip = (page - 1) * limit;

    if (filters.date) {
      const deliveryDateRange = getSingleDateOnlyRange(filters.date);

      if (deliveryDateRange) {
        where.deliveryDate = deliveryDateRange;
      }
    } else if (filters.startDate || filters.endDate) {
      const deliveryDateRange = getDateOnlyRange(
        filters.startDate,
        filters.endDate,
      );

      if (deliveryDateRange) {
        where.deliveryDate = deliveryDateRange;
      }
    }

    if (filters.search) {
      where.OR = [
        { saleOrderNumber: { contains: filters.search, mode: 'insensitive' } },
        { outboundDelivery: { contains: filters.search, mode: 'insensitive' } },
        { customerNameText: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: { name: { contains: filters.search, mode: 'insensitive' } },
        },
      ];
    }

    if (filters.payment) {
      const paymentVal = String(filters.payment).toLowerCase();
      if (
        paymentVal === 'cash' ||
        paymentVal === 'true' ||
        paymentVal === 'cleared'
      ) {
        where.paymentClearance = true;
      } else if (
        paymentVal === 'credit' ||
        paymentVal === 'false' ||
        paymentVal === 'pending'
      ) {
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
        where.AND = [{ OR: where.OR }, { OR: baseSummaryOr }];
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
    const totalOrdersCount = await this.prisma.salesOrder.count({ where });
    // --- 1. FETCH ALL MATCHING ORDERS (No Skip/Take here) ---
    const orders = await this.prisma.salesOrder.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        paymentClearance: true,
        customerNameText: true,
        isErpImported: true,
        priority: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
        salesZone: { select: { name: true } },
        statusStepper: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            salesOrderNumber: true,
            salesOrderId: true,
            status: true,
            createdDateTime: true,
            updatedBy: true,
          },
        },
      },
      orderBy: [
        { customer: { name: 'asc' } },
        { customerNameText: 'asc' },
        { salesZone: { name: 'asc' } },
        { saleOrderNumber: 'asc' },
      ],
    });

    const formattedOrders = orders.map((order) => {
      return {
        id: order.id,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        customerName: order.customer?.name || order.customerNameText || '-',
        salesZone: order.salesZone?.name || '-',
        paymentClearance: order.paymentClearance,
        createdAt: order.createdAt,
        status: order.status,
        priority: order.priority,
        isErpImported: order.isErpImported === 1,
        statusStepper: order.statusStepper,
      };
    });

    // --- 2. GROUP ALL ORDERS BY CUSTOMER NAME ---
    const groupedOrdersMap = formattedOrders.reduce(
      (acc, order) => {
        const cName = order.customerName;
        if (!acc[cName]) {
          acc[cName] = [];
        }
        acc[cName].push(order);
        return acc;
      },
      {} as Record<string, typeof formattedOrders>,
    );

    const groupedData = Object.keys(groupedOrdersMap).map((customerName) => ({
      customerName,
      orders: groupedOrdersMap[customerName],
    }));

    return {
      success: true,
      data: {
        totalOrders: totalOrdersCount,
        page,
        limit,
        totalPages: Math.ceil(totalOrdersCount / limit),
        groupedOrders: groupedData,
      },
    };
  }

  // CUSTOMER REPORTS
  async getCustomerReport(fromDate?: string, toDate?: string) {
    const where: any = {};
    const deliveryDateFilter = this.getDeliveryDateFilter(fromDate, toDate);

    if (deliveryDateFilter) {
      where.deliveryDate = deliveryDateFilter;
    }

    const [primaryOrders, archivedOrders] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        select: {
          id: true,
          customerId: true,
          customerNameText: true,
          saleOrderNumber: true,
          outboundDelivery: true,
        },
      }),
      this.prisma.salesOrderArchive.findMany({
        where,
        select: {
          id: true,
          customerId: true,
          customerNameText: true,
          saleOrderNumber: true,
          outboundDelivery: true,
        },
      }),
    ]);

    const primaryOrdersWithSource = primaryOrders.map((order) => ({
      ...order,
      source: 'ACTIVE' as const,
    }));

    const archivedOrdersWithSource = archivedOrders.map((order) => ({
      ...order,
      source: 'ARCHIVE' as const,
    }));

    const combinedOrders = [
      ...primaryOrdersWithSource,
      ...archivedOrdersWithSource,
    ];

    const customerIds = [
      ...new Set(
        combinedOrders
          .filter((order) => order.customerId !== null)
          .map((order) => order.customerId as number),
      ),
    ];

    const customers = customerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : [];

    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    const resultMap = new Map<
      string,
      {
        saleOrderNumberCount: number;
        salesOrders: {
          id: number;
          saleOrderNumber: string | null;
          outboundDelivery: string | null;
          source: 'ACTIVE' | 'ARCHIVE';
        }[];
      }
    >();

    for (const order of combinedOrders) {
      const name =
        (order.customerId
          ? customerMap.get(order.customerId)
          : order.customerNameText) || 'N/A';

      const report = resultMap.get(name) || {
        saleOrderNumberCount: 0,
        salesOrders: [],
      };

      report.saleOrderNumberCount += 1;

      report.salesOrders.push({
        id: order.id,
        saleOrderNumber: order.saleOrderNumber || null,
        outboundDelivery: order.outboundDelivery || null,
        source: order.source,
      });

      resultMap.set(name, report);
    }

    const reportData = Array.from(resultMap.entries()).map(
      ([customerName, report]) => ({
        customerName,
        saleOrderNumberCount: report.saleOrderNumberCount,
        salesOrders: report.salesOrders.sort((a, b) =>
          String(a.saleOrderNumber || '').localeCompare(
            String(b.saleOrderNumber || ''),
          ),
        ),
      }),
    );

    reportData.sort((a, b) => b.saleOrderNumberCount - a.saleOrderNumberCount);

    return {
      success: true,
      data: reportData,
    };
  }

  async getCustomerReportByMaterialCode(
    materialCode: string,
    startDate?: string,
    endDate?: string,
  ) {
    if (!materialCode) {
      return { success: true, data: [] };
    }

    const dateFilter: any = {};
    const deliveryDateRange = getDateOnlyRange(startDate, endDate);

    if (deliveryDateRange) {
      dateFilter.deliveryDate = deliveryDateRange;
    }

    const primarySalesOrders = await this.prisma.salesOrder.findMany({
      where: {
        ...dateFilter,
        materialData: {
          some: {
            Material_Code: { contains: materialCode, mode: 'insensitive' },
          },
        },
      },
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        customerId: true,
        customerNameText: true,
        materialData: {
          where: {
            Material_Code: { contains: materialCode, mode: 'insensitive' },
          },
          select: {
            Required_Qty: true,
          },
        },
      },
    });

    const archivedSalesOrdersMatches =
      await this.prisma.salesOrderArchive.findMany({
        where: dateFilter,
        select: {
          id: true,
          saleOrderNumber: true,
          outboundDelivery: true,
          customerId: true,
          customerNameText: true,
        },
      });

    const archivedOrderIds = archivedSalesOrdersMatches.map((o) => o.id);

    let archivedMaterials: any[] = [];

    if (archivedOrderIds.length > 0) {
      archivedMaterials = await this.prisma.eRP_Material_DataArchive.findMany({
        where: {
          salesOrderId: { in: archivedOrderIds },
          Material_Code: { contains: materialCode, mode: 'insensitive' },
        },
        select: {
          salesOrderId: true,
          Required_Qty: true,
        },
      });
    }

    const archiveQtyMap = new Map<number, number>();

    for (const mat of archivedMaterials) {
      if (!mat.salesOrderId) continue;

      const qty = Number(mat.Required_Qty) || 0;

      archiveQtyMap.set(
        mat.salesOrderId,
        (archiveQtyMap.get(mat.salesOrderId) || 0) + qty,
      );
    }

    const validArchivedOrders = archivedSalesOrdersMatches.filter(
      (so) => (archiveQtyMap.get(so.id) || 0) > 0,
    );

    const allCustomerIds = new Set<number>();

    primarySalesOrders.forEach((so) => {
      if (so.customerId) allCustomerIds.add(so.customerId);
    });

    validArchivedOrders.forEach((so) => {
      if (so.customerId) allCustomerIds.add(so.customerId);
    });

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: Array.from(allCustomerIds) } },
      select: {
        id: true,
        name: true,
      },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    const resultMap = new Map<
      string,
      {
        totalQuantity: number;
        orderDetails: {
          id: number;
          soNumber: string;
          outboundDelivery: string;
          requiredQuantity: number;
        }[];
      }
    >();

    for (const so of primarySalesOrders) {
      const customerName = so.customerId
        ? customerMap.get(so.customerId) || '-'
        : so.customerNameText || '-';

      const orderMaterialQty = so.materialData.reduce(
        (sum, mat) => sum + (Number(mat.Required_Qty) || 0),
        0,
      );

      if (orderMaterialQty <= 0) continue;

      const existing = resultMap.get(customerName) || {
        totalQuantity: 0,
        orderDetails: [],
      };

      existing.totalQuantity += orderMaterialQty;

      existing.orderDetails.push({
        id: so.id,
        soNumber: so.saleOrderNumber || '-',
        outboundDelivery: so.outboundDelivery || '-',
        requiredQuantity: orderMaterialQty,
      });

      resultMap.set(customerName, existing);
    }

    for (const so of validArchivedOrders) {
      const customerName = so.customerId
        ? customerMap.get(so.customerId) || '-'
        : so.customerNameText || '-';

      const orderMaterialQty = archiveQtyMap.get(so.id) || 0;

      if (orderMaterialQty <= 0) continue;

      const existing = resultMap.get(customerName) || {
        totalQuantity: 0,
        orderDetails: [],
      };

      existing.totalQuantity += orderMaterialQty;

      existing.orderDetails.push({
        id: so.id,
        soNumber: so.saleOrderNumber || '-',
        outboundDelivery: so.outboundDelivery || '-',
        requiredQuantity: orderMaterialQty,
      });

      resultMap.set(customerName, existing);
    }

    const sortedData = Array.from(resultMap.entries()).map(
      ([customerName, report]) => ({
        customerName,
        totalQuantity: report.totalQuantity,
        orderDetails: report.orderDetails.sort((a, b) =>
          a.soNumber.localeCompare(b.soNumber),
        ),
      }),
    );

    sortedData.sort((a, b) => b.totalQuantity - a.totalQuantity);

    return {
      success: true,
      data: [{ MaterialCode: materialCode }, ...sortedData],
    };
  }

  // FG STORAGE
  async getFgStorageReport(
    pageParam?: string,
    limitParam?: string,
    search?: string,
    ageFilter?: string,
  ) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const skip = (page - 1) * limit;

    const where: any = {
      fgLocation: { not: null },
      OR: [{ status: null }, { status: { in: ['R105', 'W105', 'F105'] } }],
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
      orderBy: [{ fgLocation: 'asc' }, { id: 'asc' }],
    });

    const now = new Date();

    const formattedOrders = allOrders.map((order) => {
      let locationStr = '-';
      if (order.fgLocation) {
        const loc = order.fgLocation as any;
        if (Array.isArray(loc)) {
          locationStr = loc
            .map((l: any) =>
              typeof l === 'object' && l !== null
                ? JSON.stringify(l)
                : String(l).trim(),
            )
            .join(', ');
        } else if (typeof loc === 'string') {
          locationStr = loc.trim();
        } else {
          locationStr = JSON.stringify(loc);
        }
      }

      let durationDays = 0;
      if (order.FGUpdatedDateTime) {
        const diffTime =
          now.getTime() - new Date(order.FGUpdatedDateTime).getTime();
        durationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        fgLocation: locationStr,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        LastUpdatedBy: order.FGUpdatedBy,
        dateTime: order.FGUpdatedDateTime,
        durationDays: durationDays,
        durationText: `${durationDays} ${durationDays > 1 ? 'days' : 'day'}`,
      };
    });

    let filteredOrders = formattedOrders;
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredOrders = formattedOrders.filter((o) => {
        const soMatch = o.saleOrderNumber.toLowerCase().includes(lowerSearch);
        const obdMatch = o.outboundDelivery
          ?.toLowerCase()
          .includes(lowerSearch);
        const locMatch = o.fgLocation.toLowerCase().includes(lowerSearch);

        return soMatch || obdMatch || locMatch;
      });
    }
    const ageCounts = {
      age0to3Months: filteredOrders.filter((o) => o.durationDays <= 90).length,
      age3to6Months: filteredOrders.filter(
        (o) => o.durationDays > 90 && o.durationDays <= 180,
      ).length,
      age6to12Months: filteredOrders.filter(
        (o) => o.durationDays > 180 && o.durationDays <= 365,
      ).length,
      ageAbove12Months: filteredOrders.filter((o) => o.durationDays > 365)
        .length,
    };

    // Now apply age filter
    if (ageFilter) {
      filteredOrders = filteredOrders.filter((o) => {
        if (ageFilter === '0-3') return o.durationDays <= 90;
        if (ageFilter === '3-6')
          return o.durationDays > 90 && o.durationDays <= 180;
        if (ageFilter === '6-12')
          return o.durationDays > 180 && o.durationDays <= 365;
        if (ageFilter === '>12') return o.durationDays > 365;
        return true;
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
        ageCounts,
        reportData: pagedReportData,
      },
    };
  }
}
