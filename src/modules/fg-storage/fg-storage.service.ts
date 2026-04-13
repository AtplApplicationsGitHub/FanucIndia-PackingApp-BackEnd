import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateFgLocationDto } from './dto/update-fg-location.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FgStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async assignFgLocation(dto: any, user: { userId: number; role: string; name: string }) {
    const { id: salesOrderId, fgLocation } = dto;

    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: {
        id: salesOrderId,
      },
      select: { id: true, saleOrderNumber: true, fgLocation: true },
    });

    if (!salesOrder) {
      throw new NotFoundException(`Sales Order with ID '${salesOrderId}' not found.`);
    }    
    let currentLocations: string[] = [];

    if (salesOrder.fgLocation) {
      if (Array.isArray(salesOrder.fgLocation)) {
        currentLocations = salesOrder.fgLocation as string[];
      } else if (typeof salesOrder.fgLocation === 'string') {
        currentLocations = [salesOrder.fgLocation];
      }
    }

    if (fgLocation && !currentLocations.includes(fgLocation)) {
      currentLocations.push(fgLocation);
    }

    const updatedOrder = await this.prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: {
        fgLocation: currentLocations as Prisma.JsonArray,
        UpdatedBy: user.name, 
        UpdatedDate: new Date(),
        FGUpdatedBy: user.name,
        FGUpdatedDateTime: new Date(),
      },
    });

    await this.prisma.sO_Status_Stepper.upsert({
      where: {
        salesOrderId_status: {
          salesOrderId: updatedOrder.id,
          status: "WIP Storage"
        }
      },
      update: {
        createdDateTime: new Date(),
        updatedBy: user.name,
      },
      create: {
        salesOrderNumber: updatedOrder.saleOrderNumber,
        salesOrderId: updatedOrder.id,
        status: "WIP Storage",
        createdDateTime: new Date(),
        updatedBy: user.name,
      }
    });

    return {
      message: 'FG Location updated successfully.',
      saleOrderNumber: updatedOrder.saleOrderNumber,
      fgLocation: currentLocations,
    };
  }
}