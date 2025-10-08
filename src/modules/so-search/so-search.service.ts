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
    // 1. Search in primary tables
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
      // Apply permission check for primary orders
      if (user.role === 'SALES' && salesOrder.userId !== user.userId) {
        throw new ForbiddenException(
          'You are not authorized to view this order.',
        );
      }

      const dispatchSOs = await this.prisma.dispatch_SO.findMany({
        where: { saleOrderNumber },
        select: { dispatchId: true },
      });
      const dispatchIds = dispatchSOs.map((dso) => dso.dispatchId);
      const dispatchInfo = await this.prisma.dispatch.findMany({
        where: { id: { in: dispatchIds } },
        include: { customer: true, transporter: true },
      });
      const materialDetails = await this.prisma.eRP_Material_Data.findMany({
        where: { saleOrderNumber },
        orderBy: { ID: 'asc' },
      });

      const result = {
        salesOrder,
        dispatchInfo,
        materialDetails,
        isArchived: false,
      };
      return convertBigInts(result);
    }

    // 2. If not found, search in archive tables
    const archivedSalesOrder = await this.prisma.salesOrderArchive.findFirst({
      where: { saleOrderNumber },
    });

    if (archivedSalesOrder) {
      const dispatchSOArchives = await this.prisma.dispatch_SOArchive.findMany({
        where: { saleOrderNumber },
        select: { dispatchId: true },
      });
      const dispatchIds = dispatchSOArchives.map((d) => d.dispatchId);
      const dispatchInfo = await this.prisma.dispatchArchive.findMany({
        where: { id: { in: dispatchIds } },
      });
      const materialDetails =
        await this.prisma.eRP_Material_DataArchive.findMany({
          where: { saleOrderNumber },
          orderBy: { ID: 'asc' },
        });

      const result = {
        salesOrder: archivedSalesOrder,
        dispatchInfo,
        materialDetails,
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
