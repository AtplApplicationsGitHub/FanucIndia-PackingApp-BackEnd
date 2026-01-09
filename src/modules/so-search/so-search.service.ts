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
        // plantCode: true,
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

      const canonicalSoNumber = salesOrder.saleOrderNumber;

      const [dispatchSOs, materialDetails] = await Promise.all([
        this.prisma.dispatch_SO.findMany({
          where: { saleOrderNumber: canonicalSoNumber }, 
          select: { dispatchId: true },
        }),
        this.prisma.eRP_Material_Data.findMany({
          where: { saleOrderNumber: canonicalSoNumber }, 
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

      const vehicleEntryIds = dispatchInfo
        .map((d) => d.vehicleEntry?.id)
        .filter((id): id is number => !!id);

      if (vehicleEntryIds.length > 0) {
        const archivedEntries = await this.prisma.vehicleEntryArchive.findMany({
          where: { id: { in: vehicleEntryIds } },
          select: { id: true, attachments: true },
        });

        const archivedPathsMap = new Map<number, Set<string>>();
        for (const arch of archivedEntries) {
          const paths = new Set<string>();
          const atts = (arch.attachments as any[]) || [];
          atts.forEach((a: any) => {
            if (a.path) paths.add(a.path);
            if (a.sftpPath) paths.add(a.sftpPath);
          });
          archivedPathsMap.set(arch.id, paths);
        }

        for (const d of dispatchInfo) {
          if (d.vehicleEntry && d.vehicleEntry.attachments) {
            const archivedPaths = archivedPathsMap.get(d.vehicleEntry.id);
            if (archivedPaths && archivedPaths.size > 0) {
              const activeAtts = (d.vehicleEntry.attachments as any[]) || [];
              d.vehicleEntry.attachments = activeAtts.filter((a) => {
                const p = a.path || a.sftpPath;
                return !archivedPaths.has(p);
              });
            }
          }
        }
      }

      const result = {
        salesOrder,
        dispatchInfo,
        materialDetails,
        isArchived: false,
      };
      return convertBigInts(result);
    }

    const archivedSalesOrder = await this.prisma.salesOrderArchive.findFirst({
      where: {
        saleOrderNumber: {
          equals: saleOrderNumber,
          mode: 'insensitive',
        },
      },
    });

    if (archivedSalesOrder) {
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

      const [product, customer, transporter, /*plantCode,*/ salesZone, packConfig] = await Promise.all([
        this.prisma.product.findUnique({ where: { id: archivedSalesOrder.productId } }),
        archivedSalesOrder.customerId ? this.prisma.customer.findUnique({ where: { id: archivedSalesOrder.customerId } }) : null,
        this.prisma.transporter.findUnique({ where: { id: archivedSalesOrder.transporterId } }),
        // this.prisma.plantCode.findUnique({ where: { id: archivedSalesOrder.plantCodeId } }),
        this.prisma.salesZone.findUnique({ where: { id: archivedSalesOrder.salesZoneId } }),
        this.prisma.packConfig.findUnique({ where: { id: archivedSalesOrder.packConfigId } }),
      ]);

      const salesOrderWithDetails = {
        ...archivedSalesOrder,
        product,
        customer,
        transporter,
        // plantCode,
        salesZone,
        packConfig,
      };

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

    throw new NotFoundException(
      `Sales Order with number '${saleOrderNumber}' not found.`,
    );
  }
}