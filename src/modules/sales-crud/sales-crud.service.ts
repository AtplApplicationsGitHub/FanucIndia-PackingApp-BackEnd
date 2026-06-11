import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
import { Prisma } from '@prisma/client';
import { LabelPrintDto } from './dto/label-print.dto';
import * as net from 'net';
import { PrintLabelDto } from './dto/print-label.dto';
import { SftpService } from '../sftp/sftp.service';
import {
  getDateOnlyRange,
  normalizeDateOnlyForWrite,
} from '../../common/utils/date-only.util';

@Injectable()
export class SalesCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sftpService: SftpService,
  ) {}

  async create(dto: CreateSalesCrudDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
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
      return this.update(existingComposite.id, dto as any, userId);
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

      const deliveryDate = dto.deliveryDate
        ? normalizeDateOnlyForWrite(dto.deliveryDate)
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

      const {
        customerName,
        customerId,
        productId,
        salesZoneId: dtoSalesZoneId,
        ...rest
      } = dto as any;

      const finalSalesZoneId = user?.salesZoneId || dtoSalesZoneId;

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
          salesZoneId: finalSalesZoneId,
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
      // 1. Change from findFirst to findMany to catch all OBDs
      const orders = await this.prisma.salesOrder.findMany({
        where: {
          saleOrderNumber: {
            equals: soNumber,
            mode: 'insensitive',
          },
        },
        select: {
          id: true, // Added ID for the mobile developer
          saleOrderNumber: true,
          outboundDelivery: true, // Added OBD for the popup display
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

      // 2. Throw error if NO orders are found
      if (!orders || orders.length === 0) {
        throw new NotFoundException(`Sales Order '${soNumber}' not found.`);
      }

      // 3. Format the results into a clean array
      const formattedOrders = orders.map((order) => ({
        id: order.id,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        customerName: order.customer?.name || order.customerNameText || '',
        contactNumber: order.customer?.contactNumber || null,
        address: order.address || '',
      }));

      // 4. Return the unified payload
      return {
        valid: true,
        multiple: formattedOrders.length > 1, // Easy flag for mobile developer to check
        orders: formattedOrders,
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
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const order = await this.prisma.salesOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          product: true,
          transporter: true,
          salesZone: true,
          packConfig: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Sales order not found.');
      }

      if (user?.role === 'SALES') {
        if (user?.salesZoneId && order.salesZoneId !== user.salesZoneId) {
          throw new ForbiddenException(
            'Access denied. This order belongs to a different zone.',
          );
        } else if (!user?.salesZoneId && order.userId !== userId) {
          throw new ForbiddenException('Access denied.');
        }
      }

      return order;
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException)
        throw err;
      throw new InternalServerErrorException(
        'Failed to retrieve sales order.',
        (err as Error).message,
      );
    }
  }

  async update(id: number, dto: UpdateSalesCrudDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Sales order not found.');
    }
    if (user?.role === 'SALES') {
      if (user?.salesZoneId && existing.salesZoneId !== user.salesZoneId) {
        throw new ForbiddenException(
          'Access denied. This order belongs to a different zone.',
        );
      } else if (!user?.salesZoneId && existing.userId !== userId) {
        throw new ForbiddenException('Access denied.'); // Fallback
      }
      if (
        dto.salesZoneId !== undefined &&
        dto.salesZoneId !== existing.salesZoneId
      ) {
        throw new ForbiddenException(
          'Order zone cannot be changed after creation.',
        );
      }
    }

    const restrictedStatuses = ['Dispatched'];
    if (existing.status && restrictedStatuses.includes(existing.status)) {
      throw new ForbiddenException(
        `Cannot modify order. The order is already ${existing.status}.`,
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

      const deliveryDate = dto.deliveryDate
        ? normalizeDateOnlyForWrite(dto.deliveryDate)
        : dto.deliveryDate;

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const { customerName, customerId, salesZoneId, ...rest } = dto as any;

      const zoneUpdateData =
        user?.role === 'ADMIN' && salesZoneId !== undefined
          ? { salesZoneId }
          : {};

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
          ...zoneUpdateData,
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Sales order not found.');
    }

    if (user?.role === 'SALES') {
      if (user?.salesZoneId && existing.salesZoneId !== user.salesZoneId) {
        throw new ForbiddenException(
          'Access denied. This order belongs to a different zone.',
        );
      } else if (!user?.salesZoneId && existing.userId !== userId) {
        throw new ForbiddenException('Access denied.');
      }
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
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      const salesOrderAndConditions: Prisma.SalesOrderWhereInput[] = [];
      const archiveAndConditions: Prisma.SalesOrderArchiveWhereInput[] = [];

      /**
       * ROLE-BASED ACCESS CONTROL
       *
       * SALES:
       * - See only orders from their CURRENT assigned salesZoneId.
       * - Do NOT include { userId } when salesZoneId exists.
       *
       * USER:
       * - Existing business logic preserved.
       * - USER sees orders assigned to them in assignment fields.
       *
       * ADMIN / other roles:
       * - No base restriction.
       */
      if (user?.role === 'SALES') {
        if (user.salesZoneId) {
          salesOrderAndConditions.push({ salesZoneId: user.salesZoneId });
          archiveAndConditions.push({ salesZoneId: user.salesZoneId });
        } else {
          // Fallback only for SALES users without zone.
          salesOrderAndConditions.push({ userId });
          archiveAndConditions.push({ userId });
        }
      } else if (user?.role === 'USER') {
        salesOrderAndConditions.push({
          OR: [
            { assignedUserId: userId },
            { issueAssignedUserId: userId },
            { packingAssignedUserId: userId },
          ],
        });

        archiveAndConditions.push({
          OR: [
            { assignedUserId: userId },
            { issueAssignedUserId: userId },
            { packingAssignedUserId: userId },
          ],
        });
      }

      /**
       * PAYMENT CLEARANCE FILTER
       */
      if (filters.paymentClearance !== undefined) {
        const paymentClearanceValue = filters.paymentClearance === 'true';

        salesOrderAndConditions.push({
          paymentClearance: paymentClearanceValue,
        });

        archiveAndConditions.push({
          paymentClearance: paymentClearanceValue,
        });
      }

      /**
       * SALES ZONE FILTER
       */
      if (filters.salesZoneId) {
        const reqZone = parseInt(filters.salesZoneId, 10);

        if (!Number.isNaN(reqZone)) {
          if (user?.role === 'SALES' && user.salesZoneId) {
            /**
             * SALES cannot use query params to view another zone.
             * If requested zone is not their current zone, return zero records.
             */
            if (reqZone !== user.salesZoneId) {
              salesOrderAndConditions.push({ salesZoneId: -1 });
              archiveAndConditions.push({ salesZoneId: -1 });
            }
          } else {
            /**
             * ADMIN and other permitted roles can filter by selected zone.
             */
            salesOrderAndConditions.push({ salesZoneId: reqZone });
            archiveAndConditions.push({ salesZoneId: reqZone });
          }
        }
      }

      /**
       * STATUS FILTER
       */
      if (filters.status) {
        if (filters.status === 'None') {
          salesOrderAndConditions.push({
            OR: [{ status: null }, { status: '' }],
          });

          archiveAndConditions.push({
            OR: [{ status: null }, { status: '' }],
          });
        } else {
          salesOrderAndConditions.push({ status: filters.status });
          archiveAndConditions.push({ status: filters.status });
        }
      } else if (filters.excludeStatus) {
        salesOrderAndConditions.push({
          OR: [
            { status: { not: filters.excludeStatus } },
            { status: null },
            { status: '' },
          ],
        });

        archiveAndConditions.push({
          OR: [
            { status: { not: filters.excludeStatus } },
            { status: null },
            { status: '' },
          ],
        });
      }

      /**
       * DATE FILTER
       */
      const deliveryDateRange = getDateOnlyRange(
        filters.startDate,
        filters.endDate,
      );

      if (deliveryDateRange) {
        salesOrderAndConditions.push({ deliveryDate: deliveryDateRange });
        archiveAndConditions.push({ deliveryDate: deliveryDateRange });
      }

      /**
       * SEARCH FILTER
       *
       * Important:
       * Search OR is pushed inside AND.
       * This prevents search from overwriting role-based access restrictions.
       */
      if (filters.search) {
        const searchStr = filters.search.trim();
        const s = { contains: searchStr, mode: 'insensitive' as const };

        const salesOrderSearchConditions: Prisma.SalesOrderWhereInput[] = [
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

        /**
         * Archive model must use SalesOrderArchiveWhereInput.
         * Keep only fields/relations that exist on SalesOrderArchive.
         *
         * If your SalesOrderArchive model also has transporter/packConfig relations,
         * you may add them here later.
         */
        const archiveSearchConditions: Prisma.SalesOrderArchiveWhereInput[] = [
          { saleOrderNumber: s },
          { outboundDelivery: s },
          { transferOrder: s },
          { plantCode: s },
          { specialRemarks: s },
          { status: s },
          { customerNameText: s },
          { product: { is: { name: s } } },
          { salesZone: { is: { name: s } } },
          { customer: { is: { name: s } } },
        ];

        const lowerSearch = searchStr.toLowerCase();

        if (['yes', 'true'].includes(lowerSearch)) {
          salesOrderSearchConditions.push({ paymentClearance: true });
          archiveSearchConditions.push({ paymentClearance: true });
        } else if (['no', 'false'].includes(lowerSearch)) {
          salesOrderSearchConditions.push({ paymentClearance: false });
          archiveSearchConditions.push({ paymentClearance: false });
        }

        salesOrderAndConditions.push({ OR: salesOrderSearchConditions });
        archiveAndConditions.push({ OR: archiveSearchConditions });
      }

      const whereClause: Prisma.SalesOrderWhereInput =
        salesOrderAndConditions.length > 0
          ? { AND: salesOrderAndConditions }
          : {};

      const archiveWhereClause: Prisma.SalesOrderArchiveWhereInput =
        archiveAndConditions.length > 0 ? { AND: archiveAndConditions } : {};

      if (filters.status === 'Dispatched') {
        const [primaryOrders, archivedOrders] = await Promise.all([
          this.prisma.salesOrder.findMany({
            where: whereClause,
            include: {
              customer: true,
              product: true,
              transporter: true,
              salesZone: true,
              packConfig: true,
              assignedUser: true,
              Dispatch_SO: { select: { LRnumber: true } },
              _count: {
                select: {
                  materialData: true,
                  soChatNotifications: { where: { userId } },
                },
              },
            },
          }),
          this.prisma.salesOrderArchive.findMany({
            where: archiveWhereClause,
            include: {
              customer: true,
              product: true,
              salesZone: true,
            },
          }),
        ]);

        const archivedOrderIds = archivedOrders.map((o) => o.id);
        const dispatchSoArchives =
          await this.prisma.dispatch_SOArchive.findMany({
            where: { salesOrderId: { in: archivedOrderIds } },
            select: { salesOrderId: true, LRnumber: true },
          });

        const dispatchSoMap = new Map();
        for (const dso of dispatchSoArchives) {
          if (!dispatchSoMap.has(dso.salesOrderId)) {
            dispatchSoMap.set(dso.salesOrderId, []);
          }
          dispatchSoMap.get(dso.salesOrderId).push({ LRnumber: dso.LRnumber });
        }

        const mappedPrimary = primaryOrders.map((order) => ({
          ...order,
          hasMaterialData: order._count.materialData > 0,
          notificationCount: order._count.soChatNotifications,
          isArchived: false,
        }));

        const mappedArchived = archivedOrders.map((order) => ({
          ...order,
          hasMaterialData: false,
          notificationCount: 0,
          isArchived: true,
          Dispatch_SO: dispatchSoMap.get(order.id) || [],
        }));

        const combinedOrders = [...mappedPrimary, ...mappedArchived].sort(
          (a: any, b: any) => {
            const dateA = new Date(a.UpdatedDate || a.createdAt).getTime();
            const dateB = new Date(b.UpdatedDate || b.createdAt).getTime();
            return dateB - dateA;
          },
        );

        const totalCount = combinedOrders.length;
        const paginatedCombined = combinedOrders.slice(skip, skip + limit);

        return { orders: paginatedCombined, totalCount };
      }

      /**
       * STANDARD FLOW
       */
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
        isArchived: false,
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
    // 1. Extract 'id' instead of 'salesOrderIds' and alias it to 'inputIds' for clarity
    const { id: inputIds, cncText, boxNN, quantity } = dto as any;
    const statusToSet = 'Ready for Dispatch';

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'System';
    const now = new Date();

    let newLabelPrintId: number;

    try {
      const createdLabelPrint = await this.prisma.$transaction(async (tx) => {
        // 2. Query using the new inputIds array
        const ordersToUpdate = await tx.salesOrder.findMany({
          where: {
            id: { in: inputIds },
          },
        });

        // Safety check
        if (ordersToUpdate.length !== inputIds.length) {
          throw new NotFoundException(
            'One or more specific orders could not be found.',
          );
        }

        const orderIds = ordersToUpdate.map((o) => o.id);

        await tx.salesOrder.updateMany({
          where: { id: { in: orderIds } },
          data: { UpdatedBy: userName, UpdatedDate: now },
        });

        for (const order of ordersToUpdate) {
          await tx.sO_Status_Stepper.upsert({
            where: {
              salesOrderId_status: {
                salesOrderId: order.id,
                status: statusToSet,
              },
            },
            update: { createdDateTime: now, updatedBy: userName },
            create: {
              salesOrderNumber: order.saleOrderNumber,
              salesOrderId: order.id,
              status: statusToSet,
              createdDateTime: now,
              updatedBy: userName,
            },
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
        count: inputIds.length,
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

    const printQty = Math.max(1, Number(dto.quantity) || 1);
    const customerName = order.customerNameText || order.customer?.name || '';
    const labelRemarks = order.labelRemarks || '';
    const salesZone = order.salesZone?.name || '';

    const fileName =
      process.env.ORDER_LABEL_PRN_FILE || 'FANUC_60X40_TE210_090626.prn';
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
    finalPrn = finalPrn.replace(/PRINT\s+@@Quantity@@,1/g, 'PRINT 1,1');

    // return {
    //   success: true,
    //   message: 'Dry-run successful. Here is the payload:',
    //   payload: finalPrn
    // };

    const printerHost = printer.name.trim();

    for (let i = 0; i < printQty; i++) {
      await new Promise<void>((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(5000);

        client.connect(9100, printerHost, () => {
          client.write(finalPrn, () => {
            client.end();
            resolve();
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
              `Printer error: Connection to ${printerHost}:9100 timed out after 5000ms. Verify the printer is online.`,
            ),
          );
        });
      });
    }

    return {
      success: true,
      message: `Print job sent successfully. Printed ${printQty} time(s).`,
    };
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

    const fileName =
      process.env.CUSTOMER_LABEL_PRN_FILE ||
      'FANUC_ZEBRA_ZT421_210X150_060326.prn';

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

    const configRecord = await this.prisma.systemConfig.findUnique({
      where: { key: 'CUSTOMER_LABEL_PRINTER_IP' },
    });
    const printerIp = configRecord?.value;

    if (!printerIp) {
      throw new InternalServerErrorException(
        'Customer Label Printer IP is not configured in the database. Please set it in the Master View -> Printers tab.',
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

  async uploadAttachments(
    salesOrderIds: number[],
    files: Express.Multer.File[],
    userId: number,
  ) {
    // 1. Fetch the user to check their assigned Sales Zone
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // 2. Fetch the selected Sales Orders, now including salesZoneId
    const salesOrders = await this.prisma.salesOrder.findMany({
      where: { id: { in: salesOrderIds } },
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        salesZoneId: true,
      },
    });

    if (salesOrders.length === 0) {
      throw new NotFoundException(
        'No valid sales orders found for the provided IDs.',
      );
    }

    if (user?.salesZoneId) {
      const unauthorizedOrders = salesOrders.filter(
        (order) => Number(order.salesZoneId) !== Number(user.salesZoneId),
      );

      if (unauthorizedOrders.length > 0) {
        const mismatchedDetails = unauthorizedOrders
          .map((o) => `Order ID ${o.id} is Zone ${o.salesZoneId}`)
          .join(', ');

        throw new ForbiddenException(
          `Access denied. Your Sales Zone ID is ${user.salesZoneId}, but you selected restricted orders: [${mismatchedDetails}]`,
        );
      }
    }

    // 4. Define base path from env or use a default
    const basePath = process.env.SFTP_BASE_DIR_SALESUSER_ORDER || '';
    const attachmentRecords: Prisma.SalesOrderAttachmentCreateManyInput[] = [];

    // 5. Process each Sales Order
    for (const order of salesOrders) {
      // Format the folder name as SO-OBD and sanitize it
      const folderName =
        `${order.saleOrderNumber}-${order.outboundDelivery}`.replace(
          /[^a-zA-Z0-9-_]/g,
          '_',
        );
      const remoteDir = `${basePath.replace(/\/$/, '')}/${folderName}`;

      // Ensure the directory exists on the SFTP server
      await this.sftpService.ensureDir(remoteDir);

      // 6. Process and upload each file for the current Sales Order
      for (const file of files) {
        const lastDotIndex = file.originalname.lastIndexOf('.');
        let baseName = file.originalname;
        let extension = '';

        if (lastDotIndex !== -1 && lastDotIndex !== 0) {
          baseName = file.originalname.substring(0, lastDotIndex);
          extension = file.originalname.substring(lastDotIndex);
        }

        let finalFileName = file.originalname;
        let remotePath = `${remoteDir}/${finalFileName}`;
        let counter = 1;

        // Check if file exists on SFTP and increment counter until a free name is found
        while (await this.sftpService.exists(remotePath)) {
          finalFileName = `${baseName}-${counter}${extension}`;
          remotePath = `${remoteDir}/${finalFileName}`;
          counter++;
        }

        // Upload to SFTP
        await this.sftpService.put(file.buffer, remotePath);

        // Prepare the DB record
        attachmentRecords.push({
          salesOrderId: order.id,
          saleOrderNumber: order.saleOrderNumber,
          outboundDelivery: order.outboundDelivery,
          fileName: finalFileName,
          sftpPath: remotePath,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          uploadedBy: userId,
        });
      }
    }

    // 7. Save all metadata records to the database in one transaction
    try {
      await this.prisma.salesOrderAttachment.createMany({
        data: attachmentRecords,
      });
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Files uploaded to SFTP, but failed to save metadata to the database.',
        err.message,
      );
    }

    return {
      message: 'Attachments uploaded successfully',
      totalFilesUploaded: files.length,
      appliedToOrdersCount: salesOrders.length,
    };
  }

  async getAttachments(salesOrderId: number) {
    try {
      const attachments = await this.prisma.salesOrderAttachment.findMany({
        where: { salesOrderId },
        include: {
          user: {
            select: { name: true }, // Include the name of the person who uploaded it
          },
        },
        orderBy: { createdAt: 'desc' }, // Show newest attachments first
      });

      return attachments;
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to retrieve attachments.',
        err.message,
      );
    }
  }

  async downloadAttachment(attachmentId: number, res: any) {
    // 1. Find the attachment record in the DB
    const attachment = await this.prisma.salesOrderAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment record not found.');
    }

    // 2. Verify the file actually exists on the SFTP server
    const fileExists = await this.sftpService.exists(attachment.sftpPath);
    if (!fileExists) {
      throw new NotFoundException('File no longer exists on the SFTP server.');
    }

    try {
      // 3. Set the correct headers so the browser downloads it with the right name and extension
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${attachment.fileName}"`,
      );
      res.setHeader(
        'Content-Type',
        attachment.mimeType || 'application/octet-stream',
      );

      // 4. Stream the file directly from SFTP to the user's browser
      await this.sftpService.streamToResponse(attachment.sftpPath, res);
    } catch (err: any) {
      throw new InternalServerErrorException(
        'Failed to download the file from the SFTP server.',
        err.message,
      );
    }
  }

  async bulkUpdateDeliveryDate(
    dto: { salesOrderIds: number[]; deliveryDate: string },
    userId: number,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Parse the date properly for Prisma
    const parsedDeliveryDate = normalizeDateOnlyForWrite(dto.deliveryDate);
    if (!parsedDeliveryDate) {
      throw new BadRequestException('Invalid delivery date format');
    }

    // Security Check: Fetch orders to validate permissions
    const orders = await this.prisma.salesOrder.findMany({
      where: { id: { in: dto.salesOrderIds } },
    });

    if (orders.length === 0) {
      throw new NotFoundException('No valid orders found');
    }

    const validOrderIds: number[] = [];

    for (const order of orders) {
      // 1. Zone Validation: Sales user can only modify orders in their zone (if they are restricted to one)
      if (user?.salesZoneId && order.salesZoneId !== user.salesZoneId) {
        throw new ForbiddenException(
          `Access denied. Order ${order.saleOrderNumber || order.id} belongs to a different zone.`,
        );
      }

      // 2. Status Validation: Cannot modify dispatched orders
      if (order.status === 'Dispatched') {
        throw new ForbiddenException(
          `Cannot modify dispatched orders (Order ${order.saleOrderNumber || order.id}).`,
        );
      }

      validOrderIds.push(order.id);
    }

    // Execute the bulk update
    await this.prisma.salesOrder.updateMany({
      where: { id: { in: validOrderIds } },
      data: {
        deliveryDate: parsedDeliveryDate,
        UpdatedBy: user?.name || 'System',
        UpdatedDate: new Date(),
      },
    });

    return {
      message: 'Successfully updated required dates',
      updatedCount: validOrderIds.length,
    };
  }
}
