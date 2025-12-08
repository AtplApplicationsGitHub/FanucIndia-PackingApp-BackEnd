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
    // 1. Search in primary tables (Active Orders)
    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: {
        saleOrderNumber: {
          equals: saleOrderNumber,
          mode: 'insensitive',
        },
      },
      include: {
        customer: true,
        product: true,
        transporter: true,
        plantCode: true,
        salesZone: true,
        packConfig: true,
        user: { select: { name: true } },
        assignedUser: { select: { name: true } },
        statusStepper: true,
      },
    });

    if (salesOrder) {
      if (user.role === 'SALES' && salesOrder.userId !== user.userId) {
        throw new ForbiddenException(
          'You are not authorized to view this order.',
        );
      }

      // [FIX] Use the canonical SO Number from the DB record for related queries
      const canonicalSoNumber = salesOrder.saleOrderNumber;

      const [dispatchSOs, materialDetails] = await Promise.all([
        this.prisma.dispatch_SO.findMany({
          where: { saleOrderNumber: canonicalSoNumber }, // Use canonical
          select: { dispatchId: true },
        }),
        this.prisma.eRP_Material_Data.findMany({
          where: { saleOrderNumber: canonicalSoNumber }, // Use canonical
          orderBy: { ID: 'asc' },
        }),
      ]);

      const dispatchIds = dispatchSOs.map((dso) => dso.dispatchId);

      const dispatchInfo = await this.prisma.dispatch.findMany({
        where: { id: { in: dispatchIds } },
        select: {
          id: true,
          vehicleNumber: true,
          attachments: true,
          UpdatedBy: true,
          UpdatedDate: true,
          transporterName: true, 
          transporterId: true,
          transporter: { select: { name: true } },
          vehicleEntry: {
            select: {
              id: true,
              attachments: true 
            }
          },
        },
      });

      const result = {
        salesOrder,
        dispatchInfo,
        materialDetails,
        isArchived: false,
      };
      return convertBigInts(result);
    }

    // 2. Search in Archive tables (Archived Orders)
    const archivedSalesOrder = await this.prisma.salesOrderArchive.findFirst({
      where: {
        saleOrderNumber: {
          equals: saleOrderNumber,
          mode: 'insensitive',
        },
      },
    });

    if (archivedSalesOrder) {
      // [FIX] Use the canonical SO Number from the DB record
      const canonicalSoNumber = archivedSalesOrder.saleOrderNumber;

      const [
        dispatchSOArchives,
        materialDetails,
        materialFiles,
        statusStepper,
      ] = await Promise.all([
        this.prisma.dispatch_SOArchive.findMany({ where: { saleOrderNumber: canonicalSoNumber }, select: { dispatchId: true } }),
        this.prisma.eRP_Material_DataArchive.findMany({ where: { saleOrderNumber: canonicalSoNumber }, orderBy: { ID: 'asc' } }),
        this.prisma.eRP_Material_FileArchive.findMany({ where: { saleOrderNumber: canonicalSoNumber } }),
        this.prisma.sO_Status_StepperArchive.findMany({ where: { salesOrderNumber: canonicalSoNumber } }),
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

      const archivedDispatchesRaw = await this.prisma.dispatchArchive.findMany({ 
        where: { id: { in: dispatchIds } },
        select: {
          id: true,
          vehicleNumber: true,
          attachments: true,
          UpdatedBy: true,
          UpdatedDate: true,
          transporterName: true,
          transporterId: true,
          vehicleEntryId: true,
        }
      });
      
      const dispatchTransporterIds = [...new Set(archivedDispatchesRaw.map(d => d.transporterId).filter(Boolean))] as number[];
      const vehicleEntryIds = [...new Set(archivedDispatchesRaw.map(d => d.vehicleEntryId).filter(Boolean))] as number[];

      const [dispatchTransporters, vehicleEntries] = await Promise.all([
        this.prisma.transporter.findMany({ where: { id: { in: dispatchTransporterIds } } }),
        this.prisma.vehicleEntryArchive.findMany({ 
          where: { id: { in: vehicleEntryIds } },
          select: { id: true, attachments: true } 
        }),
      ]);
      
      const transporterMap = new Map(dispatchTransporters.map(t => [t.id, t]));
      const vehicleEntryMap = new Map(vehicleEntries.map(ve => [ve.id, ve]));

      const dispatchInfo = archivedDispatchesRaw.map(dispatch => ({
        ...dispatch,
        transporter: dispatch.transporterId ? transporterMap.get(dispatch.transporterId) : null,
        vehicleEntry: dispatch.vehicleEntryId ? vehicleEntryMap.get(dispatch.vehicleEntryId) : null,
      }));

      const result = {
        salesOrder: { ...salesOrderWithDetails, statusStepper },
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