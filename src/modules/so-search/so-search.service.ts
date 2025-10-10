import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

function convertBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigInts);
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = convertBigInts(obj[key]);
      }
    }
  }
  return obj;
}

@Injectable()
export class SoSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async findDetailsBySoNumber(
    saleOrderNumber: string,
    user: { userId: number; role: string },
  ) {
    // 1. Search in primary tables (This part remains unchanged)
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { saleOrderNumber },
      include: {
        customer: true,
        product: true,
        transporter: true,
        plantCode: true,
        salesZone: true,
        packConfig: true,
        user: { select: { name: true } },
        assignedUser: { select: { name: true } },
      },
    });

    if (salesOrder) {
      if (user.role === 'SALES' && salesOrder.userId !== user.userId) {
        throw new ForbiddenException(
          'You are not authorized to view this order.',
        );
      }
      const [dispatchSOs, materialDetails] = await Promise.all([
        this.prisma.dispatch_SO.findMany({
          where: { saleOrderNumber },
          select: { dispatchId: true },
        }),
        this.prisma.eRP_Material_Data.findMany({
          where: { saleOrderNumber },
          orderBy: { ID: 'asc' },
        }),
      ]);

      const dispatchIds = dispatchSOs.map((dso) => dso.dispatchId);
      const dispatchInfo = await this.prisma.dispatch.findMany({
        where: { id: { in: dispatchIds } },
        include: { customer: true, transporter: true },
      });

      const result = {
        salesOrder,
        dispatchInfo,
        materialDetails,
        isArchived: false,
      };
      return convertBigInts(result);
    }

    // 2. If not found, search in archive tables (UPDATED LOGIC)
    const archivedSalesOrder = await this.prisma.salesOrderArchive.findFirst({
      where: { saleOrderNumber },
    });

    if (archivedSalesOrder) {
      const [
        dispatchSOArchives,
        materialDetails,
        materialFiles,
      ] = await Promise.all([
        this.prisma.dispatch_SOArchive.findMany({ where: { saleOrderNumber }, select: { dispatchId: true } }),
        this.prisma.eRP_Material_DataArchive.findMany({ where: { saleOrderNumber }, orderBy: { ID: 'asc' } }),
        this.prisma.eRP_Material_FileArchive.findMany({ where: { saleOrderNumber } }),
      ]);

      // Fetch related names for archived SalesOrder
      const [product, customer, transporter, plantCode, salesZone, packConfig] = await Promise.all([
        this.prisma.product.findUnique({ where: { id: archivedSalesOrder.productId } }),
        archivedSalesOrder.customerId ? this.prisma.customer.findUnique({ where: { id: archivedSalesOrder.customerId } }) : null,
        this.prisma.transporter.findUnique({ where: { id: archivedSalesOrder.transporterId } }),
        this.prisma.plantCode.findUnique({ where: { id: archivedSalesOrder.plantCodeId } }),
        this.prisma.salesZone.findUnique({ where: { id: archivedSalesOrder.salesZoneId } }),
        this.prisma.packConfig.findUnique({ where: { id: archivedSalesOrder.packConfigId } }),
      ]);

      const salesOrderWithDetails = {
        ...archivedSalesOrder,
        product,
        customer,
        transporter,
        plantCode,
        salesZone,
        packConfig,
      };

      // Fetch related names for archived Dispatch
      const dispatchIds = dispatchSOArchives.map((d) => d.dispatchId);
      const archivedDispatchesRaw = await this.prisma.dispatchArchive.findMany({ where: { id: { in: dispatchIds } } });
      
      const dispatchCustomerIds = [...new Set(archivedDispatchesRaw.map(d => d.customerId))];
      const dispatchTransporterIds = [...new Set(archivedDispatchesRaw.map(d => d.transporterId).filter(Boolean))] as number[];

      const [dispatchCustomers, dispatchTransporters] = await Promise.all([
        this.prisma.customer.findMany({ where: { id: { in: dispatchCustomerIds } } }),
        this.prisma.transporter.findMany({ where: { id: { in: dispatchTransporterIds } } }),
      ]);
      
      const customerMap = new Map(dispatchCustomers.map(c => [c.id, c]));
      const transporterMap = new Map(dispatchTransporters.map(t => [t.id, t]));

      const dispatchInfo = archivedDispatchesRaw.map(dispatch => ({
        ...dispatch,
        customer: customerMap.get(dispatch.customerId),
        transporter: dispatch.transporterId ? transporterMap.get(dispatch.transporterId) : null,
      }));

      const result = {
        salesOrder: salesOrderWithDetails,
        dispatchInfo,
        materialDetails,
        materialFiles,
        isArchived: true,
      };
      return convertBigInts(result);
    }

    // 3. If not found in either, throw an error
    throw new NotFoundException(
      `Sales Order with number '${saleOrderNumber}' not found.`,
    );
  }
}
