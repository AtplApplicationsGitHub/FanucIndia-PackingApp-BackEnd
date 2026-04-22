import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

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
          user: { select: { name: true, email: true } },
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
        createdByEmail: order.user?.email,
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

  async exportFgDashboardData(
    user: { userId: number; role: string },
    query: {
      search?: string;
      date?: string;
      payment?: string;
      zone?: string;
      status?: string;
    },
    res: Response,
  ) {
    const { search, date, payment, zone, status } = query;
    const where: Prisma.SalesOrderWhereInput = {};

    // --- REUSE THE SAME FILTER LOGIC AS getFgDashboardData ---
    if (date) {
      const parseYMD = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return { y, m, d };
      };
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const { y, m, d } = parseYMD(date);
      const startIST = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
      const endISTExclusive = new Date(
        Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS,
      );

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
      if (status === 'None') {
        where.OR = [{ status: { equals: null } }, { status: { equals: '' } }];
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
        { user: { name: { contains: search, mode: 'insensitive' } } },
        {
          Dispatch_SO: {
            some: {
              dispatch: {
                vehicleNumber: { contains: search, mode: 'insensitive' },
              },
            },
          },
        },
      ];

      if (paymentBoolean !== undefined) {
        searchConditions.push({ paymentClearance: { equals: paymentBoolean } });
      }

      where.AND = [
        ...(where.AND
          ? Array.isArray(where.AND)
            ? where.AND
            : [where.AND]
          : []),
        { OR: searchConditions },
      ];
    }

    // Fetch all matching records (no pagination)
    const salesOrders = await this.prisma.salesOrder.findMany({
      where,
      select: {
        deliveryDate: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        transferOrder: true,
        paymentClearance: true,
        status: true,
        fgLocation: true,
        specialRemarks: true,
        additionalRemarks: true,
        customerNameText: true,
        user: { select: { email: true } },
        Dispatch_SO: {
          select: {
            dispatch: {
              select: {
                vehicleNumber: true,
              },
            },
          },
        },
        product: { select: { name: true } },
        customer: { select: { name: true } },
        salesZone: { select: { name: true } },
        transporter: { select: { name: true } },
      },
      orderBy: { id: 'desc' },
    });

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('FG Dashboard');

    // Define Columns
    worksheet.columns = [
      { header: 'SALE ORDER NUMBER', key: 'so', width: 20 },
      { header: 'OUT BOUND DELIVERY', key: 'obd', width: 20 },
      { header: 'CUSTOMER NAME', key: 'customer', width: 30 },
      { header: 'SALES ZONE', key: 'zone', width: 15 },
      { header: 'REQUIRED DATE', key: 'date', width: 15 },
      { header: 'STATUS', key: 'status', width: 20 },
      { header: 'PAYMENT', key: 'payment', width: 15 },
      { header: 'TRANSPORTER', key: 'transporter', width: 20 },
      { header: 'VEHICLE NUMBER', key: 'vehicle', width: 20 },
      { header: 'FG LOCATION', key: 'location', width: 20 },
      { header: 'SPECIAL REMARKS', key: 'specialRemarks', width: 30 },
      { header: 'ADDITIONAL REMARKS', key: 'additionalRemarks', width: 30 },
      { header: 'SALES USER', key: 'user', width: 25 },
    ];

    // Style Header Row
    worksheet.getRow(1).font = { bold: true };

    // Add Data
    salesOrders.forEach((order) => {
      const vehicleNumber =
        order.Dispatch_SO?.length > 0
          ? order.Dispatch_SO[order.Dispatch_SO.length - 1].dispatch?.vehicleNumber
          : null;

      let fgLocString = '-';
      if (order.fgLocation) {
        if (typeof order.fgLocation === 'string') {
          fgLocString = order.fgLocation;
        } else if (Array.isArray(order.fgLocation)) {
          fgLocString = order.fgLocation.join(', ');
        } else {
          fgLocString = JSON.stringify(order.fgLocation);
        }
      }

      worksheet.addRow({
        so: order.saleOrderNumber || '-',
        obd: order.outboundDelivery || '-',
        customer: order.customerNameText || order.customer?.name || '-',
        zone: order.salesZone?.name || '-',
        date: order.deliveryDate
          ? new Date(order.deliveryDate).toLocaleDateString('en-GB')
          : '-',
        status: order.status || 'To be Issued', // Or leave blank if preferred
        payment: order.paymentClearance ? 'Yes' : 'No',
        transporter: order.transporter?.name || '-',
        vehicle: vehicleNumber || '-',
        location: fgLocString,
        specialRemarks: order.specialRemarks || '-',
        additionalRemarks: order.additionalRemarks || '-',
        user: order.user?.email || '-',
      });
    });

    // Set Response Headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=FG_Dashboard_Export.xlsx',
    );

    // Write to Response
    await workbook.xlsx.write(res);
    res.end();
  }
}