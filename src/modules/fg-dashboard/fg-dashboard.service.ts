import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { getSingleDateOnlyRange } from '../../common/utils/date-only.util';

type StepLabel =
  | 'To be Issued'
  | 'Under Issue'
  | 'Issued'
  | 'Under Packing'
  | 'Packed'
  | 'WIP Storage'
  | 'Ready for Dispatch'
  | 'Dispatched';

const PROGRESS_CONFIG: Record<StepLabel, { next: string }> = {
  'To be Issued': { next: 'Under Issue' },
  'Under Issue': { next: 'Issued' },
  Issued: { next: 'Under Packing' },
  'Under Packing': { next: 'Packed' },
  Packed: { next: 'WIP Storage' },
  'WIP Storage': { next: 'Ready for Dispatch' },
  'Ready for Dispatch': { next: 'Dispatched' },
  Dispatched: { next: '' },
};

type VehicleEntryDispatchInfo = {
  vehicleNumber: string;
  transporterName: string;
};

type SalesOrderDispatchLink = {
  dispatch?: {
    vehicleNumber?: string | null;
    transporterName?: string | null;
    transporter?: { name?: string | null } | null;
  } | null;
};

function getStageStatusInfo(order: {
  status?: string | null;
  issueAssignedUserId?: number | null;
  packingAssignedUserId?: number | null;
  fgLocation?: any;
  statusStepper?: { status: string; createdDateTime?: Date | null }[];
}) {
  const s = (order.status || '').toUpperCase();

  const isReadyForDispatch =
    order.statusStepper?.some((x) => x.status === 'Ready for Dispatch') ??
    false;

  const isWipStorage =
    order.statusStepper?.some((x) => x.status === 'WIP Storage') ?? false;

  const fgLocation = order.fgLocation;

  const hasFgLocation =
    fgLocation &&
    ((typeof fgLocation === 'string' && fgLocation.trim() !== '') ||
      (Array.isArray(fgLocation) && fgLocation.length > 0) ||
      (typeof fgLocation === 'object' &&
        !Array.isArray(fgLocation) &&
        Object.keys(fgLocation).length > 0));

  let step: StepLabel;

  if (s === 'DISPATCHED') {
    step = 'Dispatched';
  } else if (isReadyForDispatch || s.includes('READY FOR DISPATCH')) {
    step = 'Ready for Dispatch';
  } else if (hasFgLocation || isWipStorage) {
    step = 'WIP Storage';
  } else if (s.includes('F105')) {
    step = 'Packed';
  } else if (s.includes('W105')) {
    if (order.packingAssignedUserId) {
      step = 'Under Packing';
    } else {
      step = 'Issued';
    }
  } else if (s.includes('R105')) {
    if (order.issueAssignedUserId) {
      step = 'Under Issue';
    } else {
      step = 'To be Issued';
    }
  } else {
    step = 'To be Issued';
  }

  return {
    current: step,
    next: PROGRESS_CONFIG[step].next,
  };
}

@Injectable()
export class FgDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCustomerName(customerName?: string | null) {
    return customerName?.trim().toLowerCase() || '';
  }

  private getSalesOrderCustomerName(order: {
    customerNameText?: string | null;
    customer?: { name?: string | null } | null;
  }) {
    return order.customerNameText || order.customer?.name || null;
  }

  private getDispatchInfo(order: { Dispatch_SO?: SalesOrderDispatchLink[] }) {
    return order.Dispatch_SO && order.Dispatch_SO.length > 0
      ? order.Dispatch_SO[0].dispatch || null
      : null;
  }

  private getDispatchVehicleNumber(order: {
    Dispatch_SO?: SalesOrderDispatchLink[];
  }) {
    return this.getDispatchInfo(order)?.vehicleNumber || null;
  }

  private getDispatchTransporterName(order: {
    Dispatch_SO?: SalesOrderDispatchLink[];
  }) {
    const dispatchInfo = this.getDispatchInfo(order);

    return (
      dispatchInfo?.transporterName || dispatchInfo?.transporter?.name || null
    );
  }

  private async getVehicleEntryDispatchInfoByCustomerName(
    customerNames: (string | null | undefined)[],
  ) {
    const uniqueCustomerNames = [
      ...new Set(customerNames.map((name) => name?.trim()).filter(Boolean)),
    ] as string[];

    if (uniqueCustomerNames.length === 0) {
      return new Map<string, VehicleEntryDispatchInfo>();
    }

    const vehicleEntries = await this.prisma.vehicleEntry.findMany({
      where: {
        OR: uniqueCustomerNames.map((customerName) => ({
          customerName: { equals: customerName, mode: 'insensitive' },
        })),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        customerName: true,
        vehicleNumber: true,
        transporterName: true,
      },
    });

    const vehicleEntryInfoByCustomerName = new Map<
      string,
      VehicleEntryDispatchInfo
    >();
    for (const entry of vehicleEntries) {
      const customerNameKey = this.normalizeCustomerName(entry.customerName);
      if (
        !customerNameKey ||
        vehicleEntryInfoByCustomerName.has(customerNameKey)
      ) {
        continue;
      }

      vehicleEntryInfoByCustomerName.set(customerNameKey, {
        vehicleNumber: entry.vehicleNumber,
        transporterName: entry.transporterName,
      });
    }

    return vehicleEntryInfoByCustomerName;
  }

  private getVehicleEntryDispatchInfoForSalesOrder(
    order: {
      customerNameText?: string | null;
      customer?: { name?: string | null } | null;
    },
    vehicleEntryInfoByCustomerName: Map<string, VehicleEntryDispatchInfo>,
  ) {
    const customerNameKey = this.normalizeCustomerName(
      this.getSalesOrderCustomerName(order),
    );

    return vehicleEntryInfoByCustomerName.get(customerNameKey) || null;
  }

  private getVehicleNumberForSalesOrder(
    order: {
      customerNameText?: string | null;
      customer?: { name?: string | null } | null;
      Dispatch_SO?: SalesOrderDispatchLink[];
    },
    vehicleEntryInfoByCustomerName: Map<string, VehicleEntryDispatchInfo>,
  ) {
    const dispatchVehicleNumber = this.getDispatchVehicleNumber(order);
    if (dispatchVehicleNumber) {
      return dispatchVehicleNumber;
    }

    const vehicleEntryInfo = this.getVehicleEntryDispatchInfoForSalesOrder(
      order,
      vehicleEntryInfoByCustomerName,
    );

    return vehicleEntryInfo?.vehicleNumber || null;
  }

  private getTransporterNameForSalesOrder(
    order: {
      customerNameText?: string | null;
      customer?: { name?: string | null } | null;
      transporter?: { name?: string | null } | null;
      Dispatch_SO?: SalesOrderDispatchLink[];
    },
    vehicleEntryInfoByCustomerName: Map<string, VehicleEntryDispatchInfo>,
  ) {
    const dispatchTransporterName = this.getDispatchTransporterName(order);
    if (dispatchTransporterName) {
      return dispatchTransporterName;
    }

    const vehicleEntryInfo = this.getVehicleEntryDispatchInfoForSalesOrder(
      order,
      vehicleEntryInfoByCustomerName,
    );

    return vehicleEntryInfo?.transporterName || order.transporter?.name || null;
  }

  async getFgDashboardData(
    user: { userId: number; role: string },
    query: {
      search?: string;
      date?: string;
      payment?: string;
      zone?: string;
      status?: string;
      hideDispatched?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      search: rawSearch,
      date,
      payment,
      zone,
      status,
      hideDispatched,
      page = 1,
      limit = 10,
    } = query;
    const search = rawSearch
      ? rawSearch.trim().replace(/\s+/g, ' ')
      : undefined;
    const skip = (page - 1) * limit;
    // const where: Prisma.SalesOrderWhereInput = {
    //   OR: [
    //     { status: { not: 'Dispatched' } },
    //     { status: null }
    //   ]
    // };
    const where: Prisma.SalesOrderWhereInput = {};

    if (hideDispatched === 'true' && !status) {
      where.OR = [
        { status: null },
        { status: '' },
        { NOT: { status: { equals: 'Dispatched', mode: 'insensitive' } } },
      ];
    }

    if (date) {
      const deliveryDateRange = getSingleDateOnlyRange(date);

      if (deliveryDateRange) {
        where.deliveryDate = deliveryDateRange;
      }
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
        { user: { name: { contains: search, mode: 'insensitive' } } }, // Added Creator Username
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
          issueAssignedUserId: true,
          packingAssignedUserId: true,
          customerNameText: true,
          user: { select: { name: true, email: true } },
          Dispatch_SO: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              dispatch: {
                select: {
                  vehicleNumber: true,
                  transporterName: true,
                  transporter: { select: { name: true } },
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
          attachments: {
            select: {
              id: true,
              fileName: true,
              saleOrderNumber: true,
              outboundDelivery: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          id: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    const vehicleEntryInfoByCustomerName =
      await this.getVehicleEntryDispatchInfoByCustomerName(
        salesOrders.map((order) => this.getSalesOrderCustomerName(order)),
      );

    const fgData = salesOrders.map((order) => {
      const isReadyForDispatch = order.statusStepper.some(
        (s) => s.status === 'Ready for Dispatch',
      );
      const isWipStorage = order.statusStepper.some(
        (s) => s.status === 'WIP Storage',
      );
      const vehicleNumber = this.getVehicleNumberForSalesOrder(
        order,
        vehicleEntryInfoByCustomerName,
      );
      const transporterName = this.getTransporterNameForSalesOrder(
        order,
        vehicleEntryInfoByCustomerName,
      );

      return {
        id: order.id,
        deliveryDate: order.deliveryDate,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        transferOrder: order.transferOrder,
        product: order.product?.name,
        customerName: order.customerNameText || order.customer?.name,
        salesZone: order.salesZone?.name,
        transporter: transporterName,
        payment: order.paymentClearance,
        attachments: order.attachments || [],
        status: order.status,
        fgLocation: order.fgLocation,
        specialRemarks: order.specialRemarks,
        additionalRemarks: order.additionalRemarks,
        createdBy: order.user?.name,
        createdByEmail: order.user?.email,
        vehicleNumber: vehicleNumber,
        updatedBy: order.UpdatedBy,
        updatedDate: order.UpdatedDate,
        issueAssignedUserId: order.issueAssignedUserId,
        packingAssignedUserId: order.packingAssignedUserId,
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
      hideDispatched?: string;
    },
    res: Response,
  ) {
    const {
      search: rawSearch,
      date,
      payment,
      zone,
      status,
      hideDispatched,
    } = query;
    const search = rawSearch
      ? rawSearch.trim().replace(/\s+/g, ' ')
      : undefined;
    const where: Prisma.SalesOrderWhereInput = {};

    if (hideDispatched === 'true' && !status) {
      where.OR = [
        { status: null },
        { status: '' },
        { NOT: { status: { equals: 'Dispatched', mode: 'insensitive' } } },
      ];
    }

    // --- REUSE THE SAME FILTER LOGIC AS getFgDashboardData ---
    if (date) {
      const deliveryDateRange = getSingleDateOnlyRange(date);

      if (deliveryDateRange) {
        where.deliveryDate = deliveryDateRange;
      }
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
        issueAssignedUserId: true,
        packingAssignedUserId: true,
        customerNameText: true,
        user: { select: { email: true } },
        Dispatch_SO: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            dispatch: {
              select: {
                vehicleNumber: true,
                transporterName: true,
                transporter: { select: { name: true } },
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
      orderBy: { id: 'desc' },
    });

    const vehicleEntryInfoByCustomerName =
      await this.getVehicleEntryDispatchInfoByCustomerName(
        salesOrders.map((order) => this.getSalesOrderCustomerName(order)),
      );

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
      { header: 'COMPLETED STATUS', key: 'completedStatus', width: 22 },
      { header: 'NEXT STATUS', key: 'nextStatus', width: 22 },
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
      const vehicleNumber = this.getVehicleNumberForSalesOrder(
        order,
        vehicleEntryInfoByCustomerName,
      );
      const transporterName = this.getTransporterNameForSalesOrder(
        order,
        vehicleEntryInfoByCustomerName,
      );

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

      const stageInfo = getStageStatusInfo(order);

      worksheet.addRow({
        so: order.saleOrderNumber || '-',
        obd: order.outboundDelivery || '-',
        customer: order.customerNameText || order.customer?.name || '-',
        zone: order.salesZone?.name || '-',
        date: order.deliveryDate
          ? new Date(order.deliveryDate).toLocaleDateString('en-GB')
          : '-',
        completedStatus: stageInfo.current || '-',
        nextStatus: stageInfo.next || '-',
        payment: order.paymentClearance ? 'Yes' : 'No',
        transporter: transporterName || '-',
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
