import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { getIstTimestampRange } from '../../common/utils/date-only.util';
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

  async findAll(salesOrderNumber?: string, date?: string) {
    const filterDate = date?.trim();
    const where = this.buildWhere(salesOrderNumber, filterDate);

    const manualFgStorages = await this.prisma.manualFgStorage.findMany({
      where,
      orderBy: { dateTime: 'desc' },
    });

    return {
      message: 'Manual FG storage details fetched successfully.',
      filterDate,
      count: manualFgStorages.length,
      data: manualFgStorages.map((manualFgStorage) =>
        this.toResponse(manualFgStorage),
      ),
    };
  }

  async downloadExcel(
    salesOrderNumber: string | undefined,
    date: string | undefined,
    res: Response,
  ) {
    const filterDate = date?.trim();
    const manualFgStorages = await this.prisma.manualFgStorage.findMany({
      where: this.buildWhere(salesOrderNumber, filterDate),
      orderBy: { dateTime: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Manual FG Storage');

    worksheet.columns = [
      { header: 'SO Number', key: 'salesOrderNumber', width: 22 },
      { header: 'Location', key: 'fgLocation', width: 28 },
      { header: 'User', key: 'user', width: 22 },
      { header: 'Date/Time', key: 'dateTime', width: 24 },
    ];

    worksheet.getRow(1).font = { bold: true };

    manualFgStorages.forEach((manualFgStorage) => {
      worksheet.addRow({
        salesOrderNumber: manualFgStorage.salesOrderNumber,
        fgLocation: manualFgStorage.fgLocation,
        user: manualFgStorage.user,
        dateTime: this.formatIstDateTime(manualFgStorage.dateTime),
      });
    });

    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Manual_FG_Loaction_${filterDate || 'All_Dates'}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
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

  private buildWhere(
    salesOrderNumber?: string,
    date?: string,
  ): Prisma.ManualFgStorageWhereInput {
    const trimmedSalesOrderNumber = salesOrderNumber?.trim();
    const dateRange = getIstTimestampRange(date);
    const where: Prisma.ManualFgStorageWhereInput = {};

    if (trimmedSalesOrderNumber) {
      where.salesOrderNumber = trimmedSalesOrderNumber;
    }

    if (dateRange) {
      where.dateTime = {
        gte: dateRange.startOfDay,
        lt: dateRange.endOfDay,
      };
    }

    return where;
  }

  private formatIstDateTime(dateTime: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(dateTime);

    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '00';

    return `${getPart('day')}/${getPart('month')}/${getPart(
      'year',
    )} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
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
