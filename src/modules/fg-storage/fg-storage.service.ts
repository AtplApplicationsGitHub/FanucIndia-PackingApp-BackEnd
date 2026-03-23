import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateFgLocationDto } from './dto/update-fg-location.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FgStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async assignFgLocation(dto: UpdateFgLocationDto, user: { userId: number; role: string; name: string }) {
    const { saleOrderNumber, fgLocation } = dto;

    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: {
        saleOrderNumber: {
          equals: saleOrderNumber,
          mode: 'insensitive',
        },
      },
      select: { id: true, saleOrderNumber: true, fgLocation: true },
    });

    if (!salesOrder) {
      throw new NotFoundException(`Sales Order with number '${saleOrderNumber}' not found.`);
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

    await this.prisma.sO_Status_Stepper.updateMany({
      where: {
        salesOrderNumber: updatedOrder.saleOrderNumber,
        status: "WIP Storage"
      },
      data: {
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