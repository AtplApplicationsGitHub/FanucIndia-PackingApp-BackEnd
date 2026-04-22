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
import * as os from 'os';
import { CreateErpMaterialFileDto } from './dto/create-erp-material-file.dto';
import { UpdateErpMaterialFileDto } from './dto/update-erp-material-file.dto';
import { QueryErpMaterialFileDto } from './dto/query-erp-material-file.dto';

async function verifyFileAccess(
  prisma: PrismaService,
  fileId: number,
  userId: number,
  userRole: string,
) {
  if (userRole === 'ADMIN' || userRole === 'SALES' || userRole === 'USER') {
    const file = await prisma.eRP_Material_File.findUnique({
      where: { ID: fileId },
    });
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

  const so = file.salesOrderByNumber;
  if (
    !so ||
    (so.assignedUserId !== userId &&
      so.issueAssignedUserId !== userId &&
      so.packingAssignedUserId !== userId)
  ) {
    throw new ForbiddenException(
      'You do not have permission to access this file.',
    );
  }

  return file;
}

async function verifySaleOrderAccess(
  prisma: PrismaService,
  saleOrderNumber: string,
  userId: number,
  userRole: string,
) {
  if (userRole === 'ADMIN' || userRole === 'SALES') {
    const order = await prisma.salesOrder.findFirst({
      where: { saleOrderNumber },
    });
    if (!order)
      throw new NotFoundException(`Sales Order ${saleOrderNumber} not found.`);
    return;
  }

  const order = await prisma.salesOrder.findFirst({
    where: {
      saleOrderNumber: saleOrderNumber,
      OR: [
        { assignedUserId: userId },
        { issueAssignedUserId: userId },
        { packingAssignedUserId: userId },
      ],
    },
  });

  if (!order) {
    throw new ForbiddenException(
      `You do not have permission to access files for Sales Order ${saleOrderNumber}.`,
    );
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

  private safeUnlink(filePath: string) {
    try {
      const resolvedPath = path.resolve(filePath);
      const tempDir = path.resolve(os.tmpdir());

      if (resolvedPath.startsWith(tempDir)) {
        if (fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
        }
      } else {
        console.warn(
          `Security Block: Attempted to delete file outside temp dir: ${filePath}`,
        );
      }
    } catch (e) {}
  }

  async list(query: any, userId: number, userRole: string) {
    const {
      page = 1,
      limit = 20,
      search,
      saleOrderNumber,
      salesOrderId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ERP_Material_FileWhereInput = {
      ...(saleOrderNumber ? { saleOrderNumber } : {}),
      ...(salesOrderId ? { 
        OR: [
          { salesOrderId: parseInt(salesOrderId, 10) },
          { salesOrderId: null }
        ] 
      } : {}),
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

    if (userRole === 'USER') {
      where.salesOrderByNumber = {
        is: {
          OR: [
            { assignedUserId: userId },
            { issueAssignedUserId: userId },
            { packingAssignedUserId: userId },
          ],
        },
      };
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

  async listBySaleOrderNumber(
    soNumber: string,
    salesOrderId: string | undefined,
    userId: number,
    userRole: string,
  ) {
    await verifySaleOrderAccess(this.prisma, soNumber, userId, userRole);
    const whereClause: Prisma.ERP_Material_FileWhereInput = { saleOrderNumber: soNumber };
    if (salesOrderId) {
      whereClause.OR = [
        { salesOrderId: parseInt(salesOrderId, 10) },
        { salesOrderId: null }
      ];
    }
    const items = await this.prisma.eRP_Material_File.findMany({
      where: whereClause,
      orderBy: { ID: 'desc' },
    });
    return normalizeBigInt(items);
  }

  async create(_dto: CreateErpMaterialFileDto) {
    throw new BadRequestException(
      'Direct creation is disabled. Use /v1/erp-material-files/upload to create records.',
    );
  }

  async update(
    id: number,
    dto: UpdateErpMaterialFileDto,
    userId: number,
    userRole: string,
  ) {
    const existing = await verifyFileAccess(this.prisma, id, userId, userRole);

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

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
          UpdatedBy: user?.name || 'System',
          UpdatedDate: new Date(),
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
    } else if (userRole === 'USER') {
      throw new ForbiddenException('You must specify a Sale Order Number for an order assigned to you.');
    }

    const baseDir = process.env.SFTP_BASE_DIR_ORDER || '';
    const soDir = opts.saleOrderNumber ? sanitize(opts.saleOrderNumber) : 'misc';
    const remoteDir = path.posix.join(baseDir, soDir);

    const uploads: { localPath: string; remotePath: string }[] = [];
    const dbRecords: any[] = [];

    try {
      // NEW: Fetch existing sftpPaths to guarantee uniqueness
      const existingDbFiles = await this.prisma.eRP_Material_File.findMany({
        where: { sftpDir: remoteDir },
        select: { sftpPath: true },
      });
      const existingPaths = new Set(existingDbFiles.map((f) => f.sftpPath));

      for (const f of files) {
        const checksum = await sha256File(f.path);
        
        let finalName = f.originalname;
        let remotePath = path.posix.join(remoteDir, finalName);

        // Auto-increment filename if the path already exists
        if (existingPaths.has(remotePath)) {
          let counter = 1;
          const { name, ext } = this.splitFileName(f.originalname);
          do {
            finalName = `${name}-${counter}${ext}`;
            remotePath = path.posix.join(remoteDir, finalName);
            counter++;
          } while (existingPaths.has(remotePath));
        }
        existingPaths.add(remotePath);

        uploads.push({ localPath: f.path, remotePath });

        dbRecords.push({
          saleOrderNumber: opts.saleOrderNumber,
          fileName: finalName,
          description: opts.description,
          sftpPath: remotePath,
          sftpDir: remoteDir,
          fileSizeBytes: BigInt(f.size),
          mimeType: f.mimetype,
          checksumSha256: checksum,
        });
      }

      await this.sftp.uploadBatch(uploads);

      const created: any[] = [];
      for (const data of dbRecords) {
        const row = await this.prisma.eRP_Material_File.create({ data });
        created.push(row);
      }

      return {
        success: true,
        items: created.map((r) => ({ ...r, fileSizeBytes: Number(r.fileSizeBytes) })),
      };
    } catch (e: any) {
      throw new InternalServerErrorException('Upload failed. ' + (e?.message || ''));
    } finally {
      for (const f of files) {
        this.safeUnlink(f.path);
      }
    }
  }

  async uploadAndCreateWithDescriptions(
    files: Express.Multer.File[],
    opts: { descriptions: string; salesOrderId: number },
    userId: number,
    userRole: string,
  ) {
    // 1. Fetch the exact order using the ID
    const order = await this.prisma.salesOrder.findUnique({ where: { id: opts.salesOrderId } });
    if (!order) throw new NotFoundException(`Sales Order ID ${opts.salesOrderId} not found.`);

    // 2. Verify access using the DB's actual SO number
    await verifySaleOrderAccess(this.prisma, order.saleOrderNumber, userId, userRole);

    // 3. Set up folder structure based on DB values
    const baseDir = process.env.SFTP_BASE_DIR_ORDER || '';
    const folderName = order.outboundDelivery ? `${order.saleOrderNumber}_${order.outboundDelivery}` : order.saleOrderNumber;
    const remoteDir = path.posix.join(baseDir, sanitize(folderName));

    let descriptionMap: { [key: string]: string };
    try {
      descriptionMap = JSON.parse(opts.descriptions);
    } catch (error) {
      throw new BadRequestException('Invalid descriptions JSON.');
    }

    const uploads: { localPath: string; remotePath: string }[] = [];
    const dbRecords: any[] = [];

    try {
      const existingDbFiles = await this.prisma.eRP_Material_File.findMany({
        where: { sftpDir: remoteDir },
        select: { sftpPath: true },
      });
      const existingPaths = new Set(existingDbFiles.map((f) => f.sftpPath));

      for (const f of files) {
        const checksum = await sha256File(f.path);
        const description = descriptionMap[f.originalname] || null;

        let finalDbFileName = f.originalname;
        let remotePath = path.posix.join(remoteDir, finalDbFileName);

        if (existingPaths.has(remotePath)) {
          let counter = 1;
          const { name, ext } = this.splitFileName(f.originalname);
          do {
            finalDbFileName = `${name}-${counter}${ext}`;
            remotePath = path.posix.join(remoteDir, finalDbFileName);
            counter++;
          } while (existingPaths.has(remotePath));
        }
        existingPaths.add(remotePath);

        uploads.push({ localPath: f.path, remotePath });

        dbRecords.push({
          saleOrderNumber: order.saleOrderNumber, // Securely grabbed from the database
          salesOrderId: opts.salesOrderId,        // Bound strictly to the ID
          fileName: finalDbFileName,
          description: description,
          sftpPath: remotePath,
          sftpDir: remoteDir,
          fileSizeBytes: BigInt(f.size),
          mimeType: f.mimetype,
          checksumSha256: checksum,
        });
      }

      await this.sftp.uploadBatch(uploads);

      const created: any[] = [];
      for (const data of dbRecords) {
        const row = await this.prisma.eRP_Material_File.create({ data });
        created.push(row);
      }

      return {
        success: true,
        items: created.map((r) => ({ ...r, fileSizeBytes: Number(r.fileSizeBytes) })),
      };
    } catch (e: any) {
      throw new InternalServerErrorException('Upload failed. ' + (e?.message || ''));
    } finally {
      for (const f of files) {
        this.safeUnlink(f.path);
      }
    }
  }

  async getMobileSoVariants(
    saleOrderNumber: string,
    userId: number,
    userRole: string,
  ) {
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        saleOrderNumber: { equals: saleOrderNumber, mode: 'insensitive' },
      },
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
      },
      orderBy: { outboundDelivery: 'asc' },
    });

    if (orders.length === 0) {
      throw new NotFoundException(
        `No orders found matching SO Number: ${saleOrderNumber}`,
      );
    }

    return orders;
  }

  async uploadAndCreateMobile(
    files: Express.Multer.File[],
    salesOrderId: number, // <-- CHANGED: Now expects the unique ID
    descriptions: string,
    userId: number,
    userRole: string,
  ) {
    if (!salesOrderId) {
      throw new BadRequestException('You must specify a Sales Order ID.');
    }

    // <-- CHANGED: Query directly using the unique ID
    const orderExists = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId }, 
    });

    if (!orderExists) {
      throw new NotFoundException(`Sales Order with ID ${salesOrderId} not found in the system.`);
    }

    let descriptionMap: { [key: string]: string };
    try {
      descriptionMap = JSON.parse(descriptions || '{}');
    } catch (error) {
      throw new BadRequestException('Invalid descriptions JSON.');
    }

    // Extract the saleOrderNumber from the database record for folder structure
    const saleOrderNumber = orderExists.saleOrderNumber;
    const obd = orderExists.outboundDelivery;
    const baseDir = process.env.SFTP_BASE_DIR_ORDER || '';
    
    const folderName = obd ? `${saleOrderNumber}_${obd}` : saleOrderNumber;
    const soDir = folderName ? sanitize(folderName) : 'misc';
    const remoteDir = path.posix.join(baseDir, soDir);

    const uploads: { localPath: string; remotePath: string }[] = [];
    const dbRecords: any[] = [];

    try {
      const existingDbFiles = await this.prisma.eRP_Material_File.findMany({
        where: { sftpDir: remoteDir },
        select: { sftpPath: true },
      });
      const existingPaths = new Set(existingDbFiles.map((f) => f.sftpPath));

      for (const f of files) {
        const checksum = await sha256File(f.path);
        const description = descriptionMap[f.originalname] || null;

        const { name, ext } = this.splitFileName(f.originalname);
        let finalDbFileName = `${name}-mobile${ext}`;
        let remotePath = path.posix.join(remoteDir, finalDbFileName);

        // Auto-increment filename if the path already exists
        if (existingPaths.has(remotePath)) {
          let counter = 1;
          do {
            finalDbFileName = `${name}-mobile-${counter}${ext}`;
            remotePath = path.posix.join(remoteDir, finalDbFileName);
            counter++;
          } while (existingPaths.has(remotePath));
        }
        existingPaths.add(remotePath);

        uploads.push({ localPath: f.path, remotePath });

        dbRecords.push({
          saleOrderNumber: saleOrderNumber, // From DB
          salesOrderId: orderExists.id,     // From DB
          fileName: finalDbFileName,
          description: description,
          sftpPath: remotePath,
          sftpDir: remoteDir,
          fileSizeBytes: BigInt(f.size),
          mimeType: f.mimetype,
          checksumSha256: checksum,
        });
      }

      await this.sftp.uploadBatch(uploads);

      const created: any[] = [];
      for (const data of dbRecords) {
        const row = await this.prisma.eRP_Material_File.create({ data });
        created.push(row);
      }

      return {
        success: true,
        items: created.map((r) => ({ ...r, fileSizeBytes: Number(r.fileSizeBytes) })),
      };
    } catch (e: any) {
      throw new InternalServerErrorException('Upload failed. ' + (e?.message || ''));
    } finally {
      for (const f of files) {
        this.safeUnlink(f.path);
      }
    }
  }

  private splitFileName(filename: string): { name: string; ext: string } {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return { name: filename, ext: '' };
    }
    return {
      name: filename.substring(0, lastDotIndex),
      ext: filename.substring(lastDotIndex),
    };
  }

  async getMobileAttachments(salesOrderId: number) {
    const files = await this.prisma.eRP_Material_File.findMany({
      where: { 
        salesOrderId: salesOrderId 
      },
      select: {
        ID: true,
        fileName: true,
        description: true,
        createdAt: true,
      },
      orderBy: { 
        createdAt: 'desc' 
      },
    });

    if (files.length === 0) {
      throw new NotFoundException(`No attachments found for this specific Order.`);
    }

    return normalizeBigInt(files);
  }
}

async function sha256File(localPath: string): Promise<string> {
  const tmpDir = path.resolve(os.tmpdir());
  const resolved = path.resolve(localPath);

  const tmpDirWithSep = tmpDir.endsWith(path.sep) ? tmpDir : tmpDir + path.sep;
  const resolvedWithSep = resolved.endsWith(path.sep) ? resolved : resolved;

  if (!resolved.startsWith(tmpDirWithSep) && resolved !== tmpDir) {
    throw new BadRequestException('Invalid local file path');
  }

  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(resolved);
    stream.on('error', reject);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
