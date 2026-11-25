import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';
import { IbdPrintQueryDto } from './ibd-print.dto';
import {
  IBD_PRINT_DEFAULT_HEADERS,
  IBD_PRINT_FIELDS,
  IBD_PRINT_HEADER_KEYS,
  readIbdPrintWorkbook,
} from './ibd-print.excel';

function searchTerm(search?: string) {
  return search?.trim().replace(/[\\%_]/g, '\\$&');
}

function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

@Injectable()
export class IbdPrintService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(buffer: Buffer, fileName: string, uploadedById: number, uploadedByName: string) {
    const configured = await this.prisma.systemConfig.findMany({
      where: { key: { in: Object.values(IBD_PRINT_HEADER_KEYS) } },
      select: { key: true, value: true },
    });
    const valuesByKey = new Map(configured.map(({ key, value }) => [key, value]));
    const headers = { ...IBD_PRINT_DEFAULT_HEADERS };
    for (const field of IBD_PRINT_FIELDS) {
      headers[field] = valuesByKey.get(IBD_PRINT_HEADER_KEYS[field]) ?? headers[field];
    }
    const rows = await readIbdPrintWorkbook(buffer, headers);

    return this.prisma.ibdPrintUpload.create({
      data: {
        fileName,
        uploadedById,
        uploadedByName,
        rowCount: rows.length,
        rows: { createMany: { data: rows } },
      },
    });
  }

  async list({ page, limit, search }: IbdPrintQueryDto) {
    const term = searchTerm(search);
    const where: Prisma.IbdPrintUploadWhereInput = {};
    if (term) {
      where.OR = [
        { fileName: { contains: term, mode: 'insensitive' } },
        { uploadedByName: { contains: term, mode: 'insensitive' } },
      ];
      const id = Number(search?.trim());
      if (Number.isInteger(id) && id > 0 && id <= 2147483647) {
        where.OR.push({ id });
      }
    }

    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.ibdPrintUpload.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
        }),
        this.prisma.ibdPrintUpload.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { data, pagination: pagination(page, limit, total) };
  }

  async detail(uploadId: number, { page, limit, search }: IbdPrintQueryDto) {
    const term = searchTerm(search);
    const where: Prisma.IbdPrintRowWhereInput = { uploadId };
    if (term) {
      where.OR = IBD_PRINT_FIELDS.map((field) => ({
        [field]: { contains: term, mode: 'insensitive' },
      }));
    }

    const [upload, data, total] = await this.prisma.$transaction(
      [
        this.prisma.ibdPrintUpload.findUnique({ where: { id: uploadId } }),
        this.prisma.ibdPrintRow.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { rowNumber: 'asc' },
        }),
        this.prisma.ibdPrintRow.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    if (!upload) throw new NotFoundException('IBD Print upload was not found.');

    return { upload, data, pagination: pagination(page, limit, total) };
  }

  async printData(uploadId: number, rowIds: number[] = []) {
    const ids = [...new Set(rowIds)];
    const upload = await this.prisma.ibdPrintUpload.findUnique({
      where: { id: uploadId },
      include: {
        rows: {
          where: ids.length ? { id: { in: ids } } : undefined,
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
    if (!upload) throw new NotFoundException('IBD Print upload was not found.');
    if (ids.length && upload.rows.length !== ids.length) {
      throw new BadRequestException('Every selected row must belong to this IBD Print upload.');
    }

    const { rows, ...metadata } = upload;
    return { upload: metadata, data: rows };
  }

  async remove(uploadId: number): Promise<void> {
    const { count } = await this.prisma.ibdPrintUpload.deleteMany({
      where: { id: uploadId },
    });
    if (!count) throw new NotFoundException('IBD Print upload was not found.');
  }
}
