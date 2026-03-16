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
      select: {
        saleOrderNumber: true,
        outboundDelivery: true,
        paymentClearance: true,
        customerNameText: true,
        customer: { select: { name: true } },
        salesZone: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      salesordernumber: order.saleOrderNumber,
      OBD: order.outboundDelivery,
      'Customer name': order.customer?.name || order.customerNameText || 'N/A',
      SalesZone: order.salesZone?.name || 'N/A',
      payment: order.paymentClearance,
    }));
  }
}

