import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FgDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getFgDashboardData(
    user: { userId: number; role: string },
    query: { 
      search?: string; 
      date?: string; 
      payment?: string;
      zone?: string;
      status?: string;
      page?: number; 
      limit?: number 
    }
  ) {
    const { search, date, payment, zone, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    // const where: Prisma.SalesOrderWhereInput = {
    //   OR: [
    //     { status: { not: 'Dispatched' } },
    //     { status: null }
    //   ]
    // };
    const where: Prisma.SalesOrderWhereInput = {};

    if (date) {
      const parseYMD = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return { y, m, d };
      };
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const { y, m, d } = parseYMD(date);
      const startIST = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
      const endISTExclusive = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);

      where.deliveryDate = {
        gte: startIST,         
        lt: endISTExclusive,   
      };
    }

    if (payment) {
      where.paymentClearance = payment === 'true';
    }

    if (zone) {
      where.salesZoneId = parseInt(zone, 10);
    }

    if (status) {
      // delete where.OR;
      
      if (status === 'None') {
         where.OR = [
           { status: { equals: null } },
           { status: { equals: '' } }
         ];
      } else {
        where.status = { equals: status, mode: 'insensitive' };
      }
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
       let paymentBoolean: boolean | undefined = undefined;

      if (lowerSearch === 'yes') {
        paymentBoolean = true;
      } else if (lowerSearch === 'no') {
        paymentBoolean = false;
      }

      const searchConditions: Prisma.SalesOrderWhereInput[] = [
        { saleOrderNumber: { contains: search, mode: 'insensitive' } },
        { outboundDelivery: { contains: search, mode: 'insensitive' } },
        { transferOrder: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customerNameText: { contains: search, mode: 'insensitive' } },
        { salesZone: { name: { contains: search, mode: 'insensitive' } } },
        { status: { contains: search, mode: 'insensitive' } },
        { fgLocation: { array_contains: search } },
        { specialRemarks: { contains: search, mode: 'insensitive' } },
        { additionalRemarks: { contains: search, mode: 'insensitive' } },
        { UpdatedBy: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } }, // Added Creator Username
        { Dispatch_SO: { some: { dispatch: { vehicleNumber: { contains: search, mode: 'insensitive' } } } } },
      ];

      if (paymentBoolean !== undefined) {
         searchConditions.push({ paymentClearance: { equals: paymentBoolean } });
      }

      where.AND = [
        ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
        { OR: searchConditions }
      ];
    }

    const [salesOrders, totalCount] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        select: {
          id: true,
          deliveryDate: true,
          saleOrderNumber: true,
          outboundDelivery: true,
          transferOrder: true,
          paymentClearance: true,
          status: true,
          fgLocation: true,
          specialRemarks: true,
          additionalRemarks: true,
          UpdatedBy: true,
          UpdatedDate: true,
          assignedUserId: true,
          customerNameText: true,
          user: { select: { name: true } },
          Dispatch_SO: { 
            select: {
              dispatch: {
                select: {
                  vehicleNumber: true,
                },
              },
            },
          },
          statusStepper: {
            where: {
              status: { in: ['Ready for Dispatch', 'WIP Storage'] },
              createdDateTime: { not: null }, 
            },
            select: {
              status: true,
              createdDateTime: true,                 
            },
          },
          product: { select: { name: true } },
          customer: { select: { name: true } },
          salesZone: { select: { name: true } },
          transporter: { select: { name: true } },
        },
        orderBy: {
          id: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    const fgData = salesOrders.map((order) => {
      const isReadyForDispatch = order.statusStepper.some(s => s.status === 'Ready for Dispatch');
      const isWipStorage = order.statusStepper.some(s => s.status === 'WIP Storage');
      const vehicleNumber = order.Dispatch_SO?.length > 0 
        ? order.Dispatch_SO[order.Dispatch_SO.length - 1].dispatch?.vehicleNumber 
        : null;

      return {
        id: order.id,
        deliveryDate: order.deliveryDate,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        transferOrder: order.transferOrder,
        product: order.product?.name,
        customerName: order.customerNameText || order.customer?.name,
        salesZone: order.salesZone?.name,
        transporter: order.transporter?.name,
        payment: order.paymentClearance,
        status: order.status,
        fgLocation: order.fgLocation,
        specialRemarks: order.specialRemarks,
        additionalRemarks: order.additionalRemarks,
        createdBy: order.user?.name, 
        vehicleNumber: vehicleNumber,
        updatedBy: order.UpdatedBy,
        updatedDate: order.UpdatedDate,
        assignedUserId: order.assignedUserId, 
        isReadyForDispatch, 
        isWipStorage, 
      };
    });

    return { data: fgData, totalCount };
  }
}