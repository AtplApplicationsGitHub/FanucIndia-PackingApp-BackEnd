import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
import { Prisma } from '@prisma/client';
import { LabelPrintDto } from './dto/label-print.dto';
import * as net from 'net';
import { PrintLabelDto } from './dto/print-label.dto';
import { SftpService } from '../sftp/sftp.service';

@Injectable()
export class SalesCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sftpService: SftpService,
  ) {}

  async create(dto: CreateSalesCrudDto, userId: number) {
    const saleOrderNumber = dto.saleOrderNumber?.trim();
    const outboundDelivery = dto.outboundDelivery?.trim();

    const existingComposite = await this.prisma.salesOrder.findUnique({
      where: {
        saleOrderNumber_outboundDelivery: {
          saleOrderNumber,
          outboundDelivery,
        },
      },
    });

    if (existingComposite) {
      throw new ConflictException(
        `An order with Sale Order '${saleOrderNumber}' and Outbound Delivery '${outboundDelivery}' already exists.`,
      );
    }

    try {
      let resolvedCustomerId: number | null = dto.customerId ?? null;
      let finalCustomerNameText: string | null =
        dto.customerName && dto.customerName.trim()
          ? dto.customerName.trim()
          : null;

      if (!resolvedCustomerId && finalCustomerNameText) {
        let existingCustomer = await this.prisma.customer.findFirst({
          where: {
            name: { equals: finalCustomerNameText, mode: 'insensitive' },
          },
        });

        if (!existingCustomer) {
          existingCustomer = await this.prisma.customer.create({
            data: { name: finalCustomerNameText },
          });
        }
        resolvedCustomerId = existingCustomer.id;
        finalCustomerNameText = existingCustomer.name;
      } else if (resolvedCustomerId) {
        const existingCustomer = await this.prisma.customer.findUnique({
          where: { id: resolvedCustomerId },
        });
        if (existingCustomer) {
          finalCustomerNameText = existingCustomer.name;
        }
      }

      const customer = resolvedCustomerId
        ? await this.prisma.customer.findUnique({
            where: { id: resolvedCustomerId },
          })
        : null;
      const address = customer?.address || null;

      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(`${dto.deliveryDate}T00:00:00.000Z`).toISOString()
          : dto.deliveryDate;

      let resolvedProductId = dto.productId;
      if (!resolvedProductId) {
        let defaultProduct = await this.prisma.product.findFirst({
          where: { name: { equals: 'FA', mode: 'insensitive' } },
        });

        if (!defaultProduct) {
          defaultProduct = await this.prisma.product.create({
            data: { name: 'FA' },
          });
        }
        resolvedProductId = defaultProduct.id;
      }

      const { customerName, customerId, productId, ...rest } = dto as any;

      const cleanedRest = Object.fromEntries(
        Object.entries(rest).map(([k, v]) => {
          if (typeof v === 'string') {
            const t = v.trim();
            return [k, t === '' ? null : t];
          }
          return [k, v];
        }),
      ) as typeof rest;

      const newOrder = await this.prisma.salesOrder.create({
        data: {
          ...cleanedRest,
          deliveryDate,
          userId,
          productId: resolvedProductId,
          assignedUserId: null,
          customerId: resolvedCustomerId,
          printerId: null,
          address: address,
        },
        include: { customer: true },
      });

      const statuses = [
        'To be Issued',
        'Under Issue',
        'Issued',
        'Under Packing',
        'Packed',
        'WIP Storage',
        'Ready for Dispatch',
        'Dispatched',
      ];
      await this.prisma.sO_Status_Stepper.createMany({
        data: statuses.map((status) => ({
          salesOrderNumber: newOrder.saleOrderNumber,
          salesOrderId: newOrder.id,
          status: status,
          createdDateTime:
            status === 'To be Issued' ? newOrder.createdAt : null,
          updatedBy: null,
        })),
      });

      return newOrder;
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to create sales order.',
        err.message,
      );
    }
  }

  async verifySoNumber(soNumber: string) {
    try {
      const order = await this.prisma.salesOrder.findFirst({
        where: {
          saleOrderNumber: {
            equals: soNumber,
            mode: 'insensitive',
          },
        },
        select: {
          saleOrderNumber: true,
          customerNameText: true,
          address: true,
          customer: {
            select: {
              name: true,
              contactNumber: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Invalid SO Number');
      }

      return {
        valid: true,
        saleOrderNumber: order.saleOrderNumber,
        customerName: order.customer?.name || order.customerNameText || '',
        contactNumber: order.customer?.contactNumber || null,
        address: order.address || '',
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Failed to verify sales order.',
        (err as Error).message,
      );
    }
  }

  async findAll(userId: number, query: { search?: string }) {
    try {
      const { search } = query;
      const where: any = { userId };

      if (search) {
        const s = { contains: search, mode: 'insensitive' };
        where.OR = [
          { saleOrderNumber: s },
          { outboundDelivery: s },
          { transferOrder: s },
          { status: s },
          { specialRemarks: s },
          { labelRemarks: s },
          ...(['true', 'false'].includes(search.toLowerCase())
            ? [{ paymentClearance: search.toLowerCase() === 'true' }]
            : []),
          { customerNameText: s },
          { customer: { is: { name: s } } },
          { product: { is: { name: s } } },
          { transporter: { is: { name: s } } },
          { plantCode: s },
          { salesZone: { is: { name: s } } },
          { packConfig: { is: { configName: s } } },
        ];
      }

      return await this.prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          product: true,
          transporter: true,
          // plantCode: true,
          salesZone: true,
          packConfig: true,
        },
      });
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to fetch sales orders.',
        err.message,
      );
    }
  }

  async findOne(id: number, userId: number) {
    try {
      const order = await this.prisma.salesOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          product: true,
          transporter: true,
          // plantCode: true,
          salesZone: true,
          packConfig: true,
        },
      });
      if (!order || order.userId !== userId) {
        throw new NotFoundException('Sales order not found or access denied.');
      }
      return order;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        'Failed to retrieve sales order.',
        (err as Error).message,
      );
    }
  }

  async update(id: number, dto: UpdateSalesCrudDto, userId: number) {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    const restrictedStatuses = [
      'Packed',
      'WIP Storage',
      'Ready for Dispatch',
      'Dispatched',
    ];
    if (existing.status && restrictedStatuses.includes(existing.status)) {
      throw new ForbiddenException(
        `Cannot modify order. The packing stage is already completed (Current Status: ${existing.status}).`,
      );
    }

    try {
      let resolvedCustomerId: number | undefined = dto.customerId ?? undefined;
      let finalCustomerNameText: string | undefined =
        (dto as any).customerName && String((dto as any).customerName).trim()
          ? String((dto as any).customerName).trim()
          : undefined;

      if (!resolvedCustomerId && finalCustomerNameText) {
        let existingCustomer = await this.prisma.customer.findFirst({
          where: {
            name: { equals: finalCustomerNameText, mode: 'insensitive' },
          },
        });

        if (!existingCustomer) {
          existingCustomer = await this.prisma.customer.create({
            data: { name: finalCustomerNameText },
          });
        }
        resolvedCustomerId = existingCustomer.id;
        finalCustomerNameText = existingCustomer.name;
      } else if (resolvedCustomerId) {
        const existingCustomer = await this.prisma.customer.findUnique({
          where: { id: resolvedCustomerId },
        });
        if (existingCustomer) {
          finalCustomerNameText = existingCustomer.name;
        }
      }

      let address: string | null | undefined;
      if (resolvedCustomerId) {
        const customer = await this.prisma.customer.findUnique({
          where: { id: resolvedCustomerId },
        });
        if (customer) address = customer.address;
      }

      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(`${dto.deliveryDate}T00:00:00.000Z`).toISOString()
          : dto.deliveryDate;

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const { customerName, customerId, ...rest } = dto as any;

      let fgTrackingData = {};
      if ('fgLocation' in rest && rest.fgLocation !== existing.fgLocation) {
        fgTrackingData = {
          FGUpdatedBy: user?.name || 'System',
          FGUpdatedDateTime: new Date(),
        };
      }

      return await this.prisma.salesOrder.update({
        where: { id },
        data: {
          ...rest,
          ...(deliveryDate ? { deliveryDate } : {}),
          UpdatedBy: user?.name || 'System',
          UpdatedDate: new Date(),
          ...(resolvedCustomerId !== undefined
            ? { customerId: resolvedCustomerId }
            : {}),
          ...(address !== undefined && { address }),
          ...fgTrackingData,
        },
        include: {
          customer: true,
          product: true,
          transporter: true,
          salesZone: true,
          packConfig: true,
        },
      });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          throw new NotFoundException('Sales order not found.');
        }
        if (err.code === 'P2002') {
          throw new ConflictException(
            'An order with this Sale Order Number and Outbound Delivery combination already exists.',
          );
        }
      }
      throw new InternalServerErrorException(
        'Failed to update sales order.',
        err.message,
      );
    }
  }

  async remove(id: number, userId: number) {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    try {
      await this.prisma.salesOrder.delete({ where: { id } });
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Sales order not found.');
      }
      throw new InternalServerErrorException(
        'Failed to delete sales order.',
        err.message,
      );
    }
  }

  async getPaginatedOrders(
    page: number,
    limit: number,
    userId: number,
    filters: {
      search?: string;
      paymentClearance?: string;
      salesZoneId?: string;
      status?: string;
      excludeStatus?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    try {
      const skip = (page - 1) * limit;
      const whereClause: any = { userId };

      // 1. APPLY INDIVIDUAL FILTERS
      if (filters.paymentClearance !== undefined) {
        whereClause.paymentClearance = filters.paymentClearance === 'true';
      }
      if (filters.salesZoneId) {
        whereClause.salesZoneId = parseInt(filters.salesZoneId, 10);
      }
      if (filters.status) {
        if (filters.status === 'None') {
          whereClause.AND = [
            ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
            { OR: [{ status: null }, { status: '' }] },
          ];
        } else {
          whereClause.status = filters.status;
        }
      } else if (filters.excludeStatus) {
        whereClause.AND = [
          ...(Array.isArray(whereClause.AND) ? whereClause.AND : []),
          {
            OR: [
              { status: { not: filters.excludeStatus } },
              { status: null },
              { status: '' },
            ],
          },
        ];
      }
      const parseYMD = (s: string) => {
        const datePart = s.includes('T') ? s.split('T')[0] : s;
        const [y, m, d] = datePart.split('-').map(Number);
        return { y, m, d };
      };

      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

      if (filters.startDate || filters.endDate) {
        const range: { gte?: Date; lt?: Date } = {};

        if (filters.startDate) {
          const { y, m, d } = parseYMD(filters.startDate);
          const s = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
          range.gte = s;
        }

        if (filters.endDate) {
          const { y, m, d } = parseYMD(filters.endDate);
          const e = new Date(
            Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS,
          );
          range.lt = e;
        }

        whereClause.deliveryDate = {
          ...(whereClause.deliveryDate as object),
          ...range,
        };
      }

      // 2. APPLY SEARCH ACROSS ALL SPECIFIED COLUMNS
      if (filters.search) {
        const searchStr = filters.search.trim();
        const s = { contains: searchStr, mode: 'insensitive' };

        whereClause.OR = [
          { saleOrderNumber: s },
          { outboundDelivery: s },
          { transferOrder: s },
          { plantCode: s },
          { specialRemarks: s },
          { status: s },
          { customerNameText: s },
          { product: { is: { name: s } } },
          { transporter: { is: { name: s } } },
          { salesZone: { is: { name: s } } },
          { packConfig: { is: { configName: s } } },
          { customer: { is: { name: s } } },
        ];

        // Handle Payment Clearance Search (Boolean mapping)
        const lowerSearch = searchStr.toLowerCase();
        if (['yes', 'true'].includes(lowerSearch)) {
          whereClause.OR.push({ paymentClearance: true });
        } else if (['no', 'false'].includes(lowerSearch)) {
          whereClause.OR.push({ paymentClearance: false });
        }
      }

      // 3. FETCH PAGINATED RESULTS AND COUNT
      const [orders, totalCount] = await this.prisma.$transaction([
        this.prisma.salesOrder.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: true,
            product: true,
            transporter: true,
            salesZone: true,
            packConfig: true,
            assignedUser: true,
            _count: {
              select: {
                materialData: true,
                soChatNotifications: { where: { userId } },
              },
            },
          },
        }),
        this.prisma.salesOrder.count({ where: whereClause }),
      ]);

      const mappedOrders = orders.map((order) => ({
        ...order,
        hasMaterialData: order._count.materialData > 0,
        notificationCount: order._count.soChatNotifications,
      }));

      return { orders: mappedOrders, totalCount };
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to fetch paginated sales orders.',
        err.message,
      );
    }
  }

  async processLabelPrint(dto: LabelPrintDto, userId: number) {
    const { saleOrderNumbers, cncText, boxNN, quantity } = dto;
    const statusToSet = 'Ready for Dispatch';

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'System';
    const now = new Date();

    let newLabelPrintId: number;

    try {
      const createdLabelPrint = await this.prisma.$transaction(async (tx) => {
        const ordersToUpdate = await tx.salesOrder.findMany({
          where: {
            saleOrderNumber: { in: saleOrderNumbers },
            OR: [
              { status: { not: 'Dispatched' } },
              { status: null },
            ],
          },
        });

        const orderIds = ordersToUpdate.map((o) => o.id);

        await tx.salesOrder.updateMany({
          where: { id: { in: orderIds } },
          data: { UpdatedBy: userName, UpdatedDate: now },
        });

        for (const order of ordersToUpdate) {
          await tx.sO_Status_Stepper.update({
            where: {
              salesOrderId_status: {
                salesOrderId: order.id,
                status: statusToSet,
              },
            },
            data: { createdDateTime: now, updatedBy: userName },
          });
        }

        return await tx.customerLabelPrint.create({
          data: {
            userId: userId,
            userName: userName,
            cncText: cncText || 'CNC Package',
            boxNN: boxNN || '1/1',
            createdAt: now,
            entries: {
              create: ordersToUpdate.map((order) => ({
                saleOrderNumber: order.saleOrderNumber,
                salesOrderId: order.id,
              })),
            },
          },
        });
      });

      newLabelPrintId = createdLabelPrint.id;
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to update order status and save print history.',
        err.message,
      );
    }

    try {
      const printQty = quantity && quantity > 0 ? quantity : 1;
      const printResult = await this.printCustomerLabel(
        newLabelPrintId,
        printQty,
      );

      return {
        message:
          'Status updated, history saved, and physical print job sent successfully.',
        count: saleOrderNumbers.length,
        printStatus: printResult,
      };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Database updated successfully, but the printer failed: ${err.message}`,
      );
    }
  }

  async printOrderLabel(orderId: number, dto: PrintLabelDto) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: { customer: true, salesZone: true, printer: true },
    });

    if (!order) throw new NotFoundException('Sales Order not found');

    const printerId = dto.printerId ?? order.printerId;

    if (!printerId) {
      throw new InternalServerErrorException(
        'No printer provided and no printer assigned to this order.',
      );
    }

    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
    });

    if (!printer || !printer.name) {
      throw new InternalServerErrorException('Printer name not configured.');
    }

    const qty = dto.quantity || 1;
    const customerName = order.customerNameText || order.customer?.name || '';
    const labelRemarks = order.labelRemarks || '';
    const salesZone = order.salesZone?.name || '';

    // const prnCommands = [
    //   'SIZE 61.5 mm, 40 mm',
    //   'GAP 3 mm, 0 mm',
    //   'SET RIBBON ON',
    //   'DIRECTION 0,0',
    //   'REFERENCE 0,0',
    //   'OFFSET 0 mm',
    //   'SET PEEL OFF',
    //   'SET CUTTER OFF',
    //   'SET PARTIAL_CUTTER OFF',
    //   'SET TEAR ON',
    //   'CLS',
    //   'CODEPAGE 1252',
    //   `TEXT 460,283,"0",180,11,16,"${customerName}"`,
    //   `TEXT 460,208,"0",180,24,26,"${order.saleOrderNumber}"`,
    //   `TEXT 368,79,"0",180,12,14,"${labelRemarks}"`,
    //   `TEXT 460,79,"0",180,12,14,"${salesZone}"`,
    //   `QRCODE 111,127,L,4,A,180,M2,S7,"${order.saleOrderNumber}"`,
    //   `PRINT ${qty},1`,
    //   '',
    // ];

    // const finalPrn = prnCommands.join('\r\n');

    const fileName = 'FANUC_60X40_TE210_160226-LAN.prn';
    const basePath = process.env.PRN_FILE_PATH || 'uploads/fanuc/prn-files/';
    const sftpTemplatePath = `${basePath.replace(/\/$/, '')}/${fileName}`;

    let prnTemplate = '';

    try {
      const prnBuffer = await this.sftpService.getBuffer(sftpTemplatePath);
      prnTemplate = prnBuffer.toString('utf8');
    } catch (error) {
      console.error(
        `Error reading PRN file from SFTP at path: ${sftpTemplatePath}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to read the Printer template file from the SFTP server at: ${sftpTemplatePath}. Ensure the file exists.`,
      );
    }

    let finalPrn = prnTemplate;

    finalPrn = finalPrn.replace(/@@CustomerName@@/g, customerName);
    finalPrn = finalPrn.replace(/@@SONumber@@/g, order.saleOrderNumber);
    finalPrn = finalPrn.replace(/@@LabelRemarks@@/g, labelRemarks);
    finalPrn = finalPrn.replace(/@@SalesZone@@/g, salesZone);
    finalPrn = finalPrn.replace(/@@Quantity@@/g, qty.toString());

    // return {
    //   success: true,
    //   message: 'Dry-run successful. Here is the payload:',
    //   payload: finalPrn
    // };

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(5000);

      client.connect(9100, printer.name, () => {
        client.write(finalPrn, () => {
          client.end();
          resolve({ success: true, message: 'Print job sent successfully' });
        });
      });

      client.on('error', (err) => {
        client.destroy();
        reject(
          new InternalServerErrorException(`Printer error: ${err.message}`),
        );
      });

      client.on('timeout', () => {
        client.destroy();
        reject(
          new InternalServerErrorException(
            `Printer error: Connection to ${printer.name}:9100 timed out after 5000ms. Verify the printer is online.`,
          ),
        );
      });
    });
  }

  async printCustomerLabel(labelPrintId: number, quantity: number = 1) {
    const labelPrint = await this.prisma.customerLabelPrint.findUnique({
      where: { id: labelPrintId },
      include: { entries: true },
    });

    if (!labelPrint)
      throw new NotFoundException('Customer Label Print record not found');

    let addressFirstLine = '';
    let addressSecondline = '';
    let addressThirdLine = '';
    let addressFourthLine = '';
    let contactNumber = '';
    let pinCode = '';

    if (labelPrint.entries.length > 0) {
      const firstSo = await this.prisma.salesOrder.findFirst({
        where: { saleOrderNumber: labelPrint.entries[0].saleOrderNumber },
        include: { customer: true },
      });

      if (firstSo) {
        addressFirstLine =
          firstSo.customer?.name || firstSo.customerNameText || '';

        contactNumber = firstSo.customer?.contactNumber || '';

        const rawAddress = firstSo.customer?.address || firstSo.address || '';

        if (rawAddress) {
          const addrParts = rawAddress
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

          if (addrParts.length > 0) {
            pinCode = addrParts.pop() || '';
          }

          if (addrParts.length > 0) {
            addressFourthLine = addrParts.pop() || '';
          }

          if (addrParts.length > 0) {
            const half = Math.ceil(addrParts.length / 2);
            addressSecondline = addrParts.slice(0, half).join(', ');
            addressThirdLine = addrParts.slice(half).join(', ');
          }
        }
      }
    }

    const soNumbers = labelPrint.entries.map((e) => e.saleOrderNumber);
    const cncPackage = labelPrint.cncText || '';
    const boxNumber = labelPrint.boxNN || '';

    const fileName = 'FANUC_ZEBRA_ZT421_210X150_060326.prn';

    const basePath = process.env.PRN_FILE_PATH || 'uploads/fanuc/prn-files/';

    const sftpTemplatePath = `${basePath.replace(/\/$/, '')}/${fileName}`;

    let prn = '';

    try {
      const prnBuffer = await this.sftpService.getBuffer(sftpTemplatePath);

      prn = prnBuffer.toString('utf8');
    } catch (error) {
      console.error(
        `Error reading PRN file from SFTP at path: ${sftpTemplatePath}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to read the Printer template file from the SFTP server at: ${sftpTemplatePath}. Ensure the file exists.`,
      );
    }

    for (let i = 0; i < 15; i++) {
      prn = prn.replace('@@SONumber@@', soNumbers[i] || '');
    }

    prn = prn.replace(/@@CNCPackage@@/g, cncPackage);
    prn = prn.replace(/@@BoxNumber@@/g, boxNumber);
    prn = prn.replace(/@@AddressFirstLine@@/g, addressFirstLine);
    prn = prn.replace(/@@AddressSecondline@@/g, addressSecondline);
    prn = prn.replace(/@@AddressThirdLine@@/g, addressThirdLine);
    prn = prn.replace(/@@AddressFourthLine@@/g, addressFourthLine);
    prn = prn.replace(/@@CustomerContactNumber@@/g, contactNumber);
    prn = prn.replace(/@@ContactNumber@@/g, contactNumber);
    prn = prn.replace(/@@PinCode@@/g, pinCode);

    const printerIp = process.env.CUSTOMER_LABEL_PRINTER_IP;
    if (!printerIp) {
      throw new InternalServerErrorException(
        'Printer IP not configured in .env (CUSTOMER_LABEL_PRINTER_IP)',
      );
    }

    const finalPayload = prn.repeat(quantity);

    // return {
    //   success: true,
    //   message: 'Dry-run successful. Here is the generated payload:',
    //   payload: prn,
    // };

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(5000);

      client.connect(9100, printerIp, () => {
        client.write(finalPayload, () => {
          client.end();
          resolve({
            success: true,
            message: 'Customer Label Print job sent successfully',
          });
        });
      });

      client.on('error', (err) => {
        client.destroy();
        reject(
          new InternalServerErrorException(`Printer error: ${err.message}`),
        );
      });

      client.on('timeout', () => {
        client.destroy();
        reject(
          new InternalServerErrorException(
            `Printer error: Connection to ${printerIp}:9100 timed out after 5000ms. Verify the printer is online.`,
          ),
        );
      });
    });
  }
}
