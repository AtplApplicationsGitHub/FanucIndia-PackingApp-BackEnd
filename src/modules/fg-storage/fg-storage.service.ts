import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateFgLocationDto } from './dto/update-fg-location.dto';

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
    });

    if (!salesOrder) {
      throw new NotFoundException(`Sales Order with number '${saleOrderNumber}' not found.`);
    }

    const updatedOrder = await this.prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: {
        fgLocation: fgLocation,
        UpdatedBy: user.name, 
        UpdatedDate: new Date(),
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
      fgLocation: updatedOrder.fgLocation,
    };
  }
}