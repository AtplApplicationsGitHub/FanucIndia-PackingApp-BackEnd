import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReportsSalesOrderService {
  constructor(private readonly prisma: PrismaService) {}

  // async getSalesOrderReportsAnalysis(filters: any) {
  //   const where: any = {};

  //   if (filters.startDate || filters.endDate) {
  //     const gte = filters.startDate ? new Date(filters.startDate) : undefined;
  //     const lt = filters.endDate ? new Date(filters.endDate) : undefined;

  //     where.createdAt = {};
  //     if (gte) where.createdAt.gte = gte;
  //     // If endDate is provided, encompass the entire day
  //     if (lt) {
  //       const nextDay = new Date(lt);
  //       nextDay.setDate(nextDay.getDate() + 1);
  //       where.createdAt.lt = nextDay;
  //     }
  //   }

  //   if (filters.status) {
  //     where.status = filters.status;
  //   }

  //   if (filters.salesZoneId) {
  //     where.salesZoneId = parseInt(filters.salesZoneId, 10);
  //   }

  //   // 1. Total Orders count
  //   const totalOrders = await this.prisma.salesOrder.count({ where });

  //   // 2. Orders grouped by status
  //   const groupStatus = await this.prisma.salesOrder.groupBy({
  //     by: ['status'],
  //     where,
  //     _count: { id: true },
  //   });

  //   // 3. Orders grouped by Payment Clearance
  //   const groupPayment = await this.prisma.salesOrder.groupBy({
  //     by: ['paymentClearance'],
  //     where,
  //     _count: { id: true },
  //   });

  //   // 4. Transform data for analysis
  //   const analysisByStatus = groupStatus.map(g => ({
  //     status: g.status || 'No Status',
  //     count: g._count.id
  //   }));

  //   const paymentClearedCount = groupPayment.find(g => g.paymentClearance === true)?._count.id || 0;
  //   const paymentPendingCount = groupPayment.find(g => g.paymentClearance === false)?._count.id || 0;

  //   return {
  //     success: true,
  //     data: {
  //       totalOrders,
  //       analysisByStatus,
  //       paymentStatus: {
  //         cleared: paymentClearedCount,
  //         pending: paymentPendingCount
  //       }
  //     }
  //   };
  // }

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
}
