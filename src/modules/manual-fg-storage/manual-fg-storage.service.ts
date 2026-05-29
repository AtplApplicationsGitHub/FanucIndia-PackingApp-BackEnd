import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateManualFgStorageDto } from './dto/create-manual-fg-storage.dto';

type ManualFgStorageResponse = {
  id: number;
  salesOrderNumber: string;
  fgLocation: string;
  user: string;
  dateTime: string;
};

@Injectable()
export class ManualFgStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(salesOrderNumber?: string) {
    const trimmedSalesOrderNumber = salesOrderNumber?.trim();

    const manualFgStorages = await this.prisma.manualFgStorage.findMany({
      where: trimmedSalesOrderNumber
        ? { salesOrderNumber: trimmedSalesOrderNumber }
        : undefined,
      orderBy: { dateTime: 'desc' },
    });

    return {
      message: 'Manual FG storage details fetched successfully.',
      count: manualFgStorages.length,
      data: manualFgStorages.map((manualFgStorage) =>
        this.toResponse(manualFgStorage),
      ),
    };
  }

  async create(dto: CreateManualFgStorageDto) {
    const dateTime = this.parseUtcDateTime(dto.dateTime);

    const manualFgStorage = await this.prisma.manualFgStorage.create({
      data: {
        salesOrderNumber: dto.salesOrderNumber,
        fgLocation: dto.fgLocation,
        user: dto.user,
        dateTime,
      },
    });

    return {
      message: 'Manual FG storage saved successfully.',
      data: this.toResponse(manualFgStorage),
    };
  }

  async createMany(dtos: CreateManualFgStorageDto[]) {
    if (!dtos.length) {
      throw new BadRequestException('At least one manual FG storage entry is required.');
    }

    const manualFgStorages = await this.prisma.$transaction(
      dtos.map((dto) =>
        this.prisma.manualFgStorage.create({
          data: {
            salesOrderNumber: dto.salesOrderNumber,
            fgLocation: dto.fgLocation,
            user: dto.user,
            dateTime: this.parseUtcDateTime(dto.dateTime),
          },
        }),
      ),
    );

    return {
      message: 'Manual FG storage entries saved successfully.',
      count: manualFgStorages.length,
      data: manualFgStorages.map((manualFgStorage) =>
        this.toResponse(manualFgStorage),
      ),
    };
  }

  private parseUtcDateTime(dateTime?: string) {
    if (!dateTime) {
      return new Date();
    }

    const trimmedDateTime = dateTime.trim();
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmedDateTime);
    const utcDateTime = hasTimezone ? trimmedDateTime : `${trimmedDateTime}Z`;
    const parsedDateTime = new Date(utcDateTime);

    if (Number.isNaN(parsedDateTime.getTime())) {
      throw new BadRequestException('dateTime must be a valid UTC date/time.');
    }

    return parsedDateTime;
  }

  private toResponse(record: {
    id: number;
    salesOrderNumber: string;
    fgLocation: string;
    user: string;
    dateTime: Date;
  }): ManualFgStorageResponse {
    return {
      id: record.id,
      salesOrderNumber: record.salesOrderNumber,
      fgLocation: record.fgLocation,
      user: record.user,
      dateTime: record.dateTime.toISOString(),
    };
  }
}
