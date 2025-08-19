import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { SftpService } from '../sftp/sftp.service';
import * as path from 'path';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { CreateErpMaterialFileDto } from './dto/create-erp-material-file.dto';
import { UpdateErpMaterialFileDto } from './dto/update-erp-material-file.dto';
import { QueryErpMaterialFileDto } from './dto/query-erp-material-file.dto';

async function verifyFileAccess(
  prisma: PrismaService,
  fileId: number,
  userId: number,
  userRole: string,
) {
  if (userRole === 'admin' || userRole === 'sales') {
    const file = await prisma.eRP_Material_File.findUnique({ where: { ID: fileId } });
    if (!file) throw new NotFoundException('File not found.');
    return file;
  }

  const file = await prisma.eRP_Material_File.findUnique({
    where: { ID: fileId },
    include: {
      salesOrderByNumber: true,
    },
  });

  if (!file) {
    throw new NotFoundException('File not found.');
  }

  if (!file.salesOrderByNumber || file.salesOrderByNumber.assignedUserId !== userId) {
    throw new ForbiddenException('You do not have permission to access this file.');
  }

  return file;
}

async function verifySaleOrderAccess(
  prisma: PrismaService,
  saleOrderNumber: string,
  userId: number,
  userRole: string,
) {
  if (userRole === 'admin' || userRole === 'sales') {
    const order = await prisma.salesOrder.findUnique({ where: { saleOrderNumber } });
    if (!order) throw new NotFoundException(`Sales Order ${saleOrderNumber} not found.`);
    return;
  }

  const order = await prisma.salesOrder.findFirst({
    where: {
      saleOrderNumber: saleOrderNumber,
      assignedUserId: userId,
    },
  });

  if (!order) {
    throw new ForbiddenException(`You do not have permission to access files for Sales Order ${saleOrderNumber}.`);
  }
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeBigInt<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map((v) => normalizeBigInt(v));
  if (typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any))
      out[k] = normalizeBigInt(v);
    return out;
  }
  return obj;
}

@Injectable()
export class ErpMaterialFileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sftp: SftpService,
  ) {}

  async list(query: QueryErpMaterialFileDto, userId: number, userRole: string) {
    const {
      page = 1,
      limit = 20,
      search,
      saleOrderNumber,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ERP_Material_FileWhereInput = {
      ...(saleOrderNumber ? { saleOrderNumber } : {}),
      ...(search
        ? {
            OR: [
              { fileName: { contains: search } },
              { description: { contains: search } },
              { saleOrderNumber: { contains: search } },
            ],
          }
        : {}),
    };

    if (userRole === 'user') {
        where.salesOrderByNumber = {
            is: {
                assignedUserId: userId,
            }
        }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.eRP_Material_File.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          salesOrderByNumber: true,
        },
      }),
      this.prisma.eRP_Material_File.count({ where }),
    ]);

    return normalizeBigInt({
      items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  async get(id: number, userId: number, userRole: string) {
    const row = await verifyFileAccess(this.prisma, id, userId, userRole);
    return normalizeBigInt(row);
  }

  async listBySaleOrderNumber(soNumber: string, userId: number, userRole: string) {
    await verifySaleOrderAccess(this.prisma, soNumber, userId, userRole);
    const items = await this.prisma.eRP_Material_File.findMany({
      where: { saleOrderNumber: soNumber },
      orderBy: { createdAt: 'desc' },
    });
    return normalizeBigInt(items);
  }

  async create(_dto: CreateErpMaterialFileDto) {
    throw new BadRequestException(
      'Direct creation is disabled. Use /v1/erp-material-files/upload to create records.',
    );
  }

  async update(id: number, dto: UpdateErpMaterialFileDto, userId: number, userRole: string) {
    const existing = await verifyFileAccess(this.prisma, id, userId, userRole);

    try {
      const updated = await this.prisma.eRP_Material_File.update({
        where: { ID: id },
        data: {
          saleOrderNumber:
            dto.saleOrderNumber !== undefined
              ? dto.saleOrderNumber
              : existing.saleOrderNumber,
          fileName: dto.fileName ?? existing.fileName,
          description:
            dto.description !== undefined
              ? dto.description
              : existing.description,
        },
      });
      return normalizeBigInt(updated);
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Update violates unique constraint (saleOrderNumber, fileName).',
        );
      }
      throw new InternalServerErrorException(
        'Failed to update ERP material file.',
      );
    }
  }

  async remove(id: number, userId: number, userRole: string) {
    const existing = await verifyFileAccess(this.prisma, id, userId, userRole);

    try {
      if (existing.sftpPath) {
        await this.sftp.delete(existing.sftpPath);
      }
    } catch (e) {
      console.warn('SFTP delete failed but proceeding with DB cleanup', e);
    }

    await this.prisma.eRP_Material_File.delete({ where: { ID: id } });
    return { success: true };
  }

  async uploadAndCreate(
    files: Express.Multer.File[],
    opts: { saleOrderNumber: string | null; description: string | null },
    userId: number,
    userRole: string,
  ) {
    if (opts.saleOrderNumber) {
        await verifySaleOrderAccess(this.prisma, opts.saleOrderNumber, userId, userRole);
    } else if (userRole === 'user') {
        throw new ForbiddenException("You must specify a Sale Order Number for an order assigned to you.");
    }

    const baseDir = process.env.SFTP_BASE_DIR || '/fanuc/order-attachments';
    const soDir = opts.saleOrderNumber
      ? sanitize(opts.saleOrderNumber)
      : 'misc';
    const remoteDir = path.posix.join(baseDir, soDir);

    const created: any[] = [];
    try {
      for (const f of files) {
        const checksum = await sha256File(f.path);
        const remoteName = f.filename;
        const remotePath = path.posix.join(remoteDir, remoteName);

        await this.sftp.put(f.path, remotePath);

        const row = await this.prisma.eRP_Material_File.create({
          data: {
            saleOrderNumber: opts.saleOrderNumber,
            fileName: f.originalname,
            description: opts.description,
            sftpPath: remotePath,
            sftpDir: remoteDir,
            fileSizeBytes: BigInt(f.size),
            mimeType: f.mimetype,
            checksumSha256: checksum,
          },
        });

        created.push(row);
      }
      return {
        success: true,
        items: created.map((r) => ({
          ...r,
          fileSizeBytes: Number(r.fileSizeBytes),
        })),
      };
    } catch (e: any) {
      throw new InternalServerErrorException(
        'Upload failed. ' + (e?.message || ''),
      );
    } finally {
      for (const f of files) {
        try {
          fs.unlinkSync(f.path);
        } catch {}
      }
    }
  }
}

async function sha256File(localPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(localPath);
    stream.on('error', reject);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
