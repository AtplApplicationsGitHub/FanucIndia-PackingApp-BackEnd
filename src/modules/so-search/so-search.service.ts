import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  async findDetailsBySoNumber(saleOrderNumber: string, user: { userId: number; role: string }) {
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

    if (!salesOrder) {
      throw new NotFoundException('Sales Order not found');
    }

    if (user.role === 'SALES' && salesOrder.userId !== user.userId) {
      throw new ForbiddenException('You are not authorized to view this order.');
    }

    const dispatchSOs = await this.prisma.dispatch_SO.findMany({
      where: { saleOrderNumber },
      select: { dispatchId: true },
    });

    const dispatchIds = dispatchSOs.map((dso) => dso.dispatchId);

    const dispatchInfo = await this.prisma.dispatch.findMany({
      where: {
        id: { in: dispatchIds },
      },
      include: {
        customer: { select: { name: true, address: true } },
        transporter: { select: { name: true } },
      },
    });

    const materialDetails = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber },
    });

    const result = {
      salesOrder,
      dispatchInfo,
      materialDetails,
    };

    return convertBigInts(result);
  }
}