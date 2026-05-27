import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateFgLocationDto } from './dto/update-fg-location.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FgStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async assignFgLocation(
    dto: UpdateFgLocationDto,
    user: { userId: number; role: string; name: string },
  ) {
    const {
      id: salesOrderId,
      fgLocation,
      transporterId,
      transporterName,
    } = dto;

    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: {
        id: salesOrderId,
      },
      select: { id: true, saleOrderNumber: true, fgLocation: true },
    });

    if (!salesOrder) {
      throw new NotFoundException(
        `Sales Order with ID '${salesOrderId}' not found.`,
      );
    }

    let resolvedTransporterId: number | undefined;

    if (transporterId !== undefined && transporterId !== null) {
      const transporter = await this.prisma.transporter.findUnique({
        where: { id: transporterId },
        select: { id: true },
      });

      if (!transporter) {
        throw new NotFoundException(
          `Transporter with ID '${transporterId}' not found.`,
        );
      }

      resolvedTransporterId = transporter.id;
    } else if (transporterName !== undefined) {
      const trimmedTransporterName = transporterName.trim();

      if (!trimmedTransporterName) {
        throw new BadRequestException('Transporter name cannot be empty.');
      }

      let transporter = await this.prisma.transporter.findFirst({
        where: {
          name: { equals: trimmedTransporterName, mode: 'insensitive' },
        },
        select: { id: true },
      });

      if (!transporter) {
        transporter = await this.prisma.transporter.create({
          data: { name: trimmedTransporterName },
          select: { id: true },
        });
      }

      resolvedTransporterId = transporter.id;
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
        ...(resolvedTransporterId !== undefined && {
          transporterId: resolvedTransporterId,
        }),
        UpdatedBy: user.name,
        UpdatedDate: new Date(),
        FGUpdatedBy: user.name,
        FGUpdatedDateTime: new Date(),
      },
      include: {
        transporter: { select: { id: true, name: true } },
      },
    });

    await this.prisma.sO_Status_Stepper.upsert({
      where: {
        salesOrderId_status: {
          salesOrderId: updatedOrder.id,
          status: 'WIP Storage',
        },
      },
      update: {
        createdDateTime: new Date(),
        updatedBy: user.name,
      },
      create: {
        salesOrderNumber: updatedOrder.saleOrderNumber,
        salesOrderId: updatedOrder.id,
        status: 'WIP Storage',
        createdDateTime: new Date(),
        updatedBy: user.name,
      },
    });

    return {
      message: 'FG Location updated successfully.',
      saleOrderNumber: updatedOrder.saleOrderNumber,
      fgLocation: currentLocations,
      transporter: updatedOrder.transporter,
    };
  }
}
