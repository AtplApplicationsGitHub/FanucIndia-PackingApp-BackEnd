import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateVehicleEntryDto } from './dto/create-vehicle-entry.dto';
import { SftpService } from '../sftp/sftp.service';
import * as path from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class VehicleEntryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sftpService: SftpService,
  ) {}

  private normalizeAttachments(attachments: Prisma.JsonValue | null) {
    return Array.isArray(attachments) ? attachments : [];
  }

  async create(dto: CreateVehicleEntryDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'System';

    return this.prisma.vehicleEntry.create({
      data: {
        customerName: dto.customerName,
        vehicleNumber: dto.vehicleNumber,
        transporterName: dto.transporterName,
        driverNumber: dto.driverNumber,
        driverName: dto.driverName,
        inTime: dto.inTime,
        outTime: dto.outTime,
        createdBy: userId,
        updatedBy: userName,
        attachments: Prisma.JsonNull,
      },
    });
  }

  async findAll(status = 'all', startDate?: string, endDate?: string) {
    const normalizedStatus = (status || 'all').toLowerCase();
    if (!['all', 'pending', 'started', 'created'].includes(normalizedStatus)) {
      throw new BadRequestException(
        "status must be one of 'all', 'pending', or 'started'.",
      );
    }

    const where: Prisma.VehicleEntryWhereInput = {};

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();

      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate provided.');
      }
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate provided.');
      }

      end.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    const entries = await this.prisma.vehicleEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        vehicleNumber: true,
        transporterName: true,
        driverNumber: true,
        driverName: true,
        inTime: true,
        outTime: true,
        attachments: true,
        createdBy: true,
        createdAt: true,
        updatedBy: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        dispatches: {
          select: { id: true },
        },
      },
    });

    if (entries.length === 0) {
      return [];
    }

    const entryIds = entries.map((entry) => entry.id);
    const archivedDispatches = await this.prisma.dispatchArchive.findMany({
      where: {
        vehicleEntryId: { in: entryIds },
      },
      select: {
        vehicleEntryId: true,
      },
    });

    const archivedDispatchEntryIds = new Set(
      archivedDispatches
        .map((dispatch) => dispatch.vehicleEntryId)
        .filter((entryId): entryId is number => entryId !== null),
    );

    const mappedEntries = entries.map((entry) => {
      const hasDispatch =
        entry.dispatches.length > 0 || archivedDispatchEntryIds.has(entry.id);

      return {
        id: entry.id,
        customerName: entry.customerName,
        vehicleNumber: entry.vehicleNumber,
        transporterName: entry.transporterName,
        driverNumber: entry.driverNumber,
        driverName: entry.driverName,
        inTime: entry.inTime,
        outTime: entry.outTime,
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
        updatedBy: entry.updatedBy,
        updatedAt: entry.updatedAt,
        attachments: this.normalizeAttachments(entry.attachments),
        createdUser: entry.user,
        dispatchStatus: hasDispatch ? 'Started' : 'Pending',
      };
    });

    if (normalizedStatus === 'pending') {
      return mappedEntries.filter(
        (entry) => entry.dispatchStatus === 'Pending',
      );
    }

    if (normalizedStatus === 'started' || normalizedStatus === 'created') {
      return mappedEntries.filter(
        (entry) => entry.dispatchStatus === 'Started',
      );
    }

    return mappedEntries;
  }

  async uploadAttachments(entryId: number, files: Express.Multer.File[], userId: number) {
    const entry = await this.prisma.vehicleEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Vehicle Entry with ID ${entryId} not found.`);
    }

    const uploadedFiles: any[] = (entry.attachments as any[]) || [];
    
    const remoteDir = path.posix.join(
      process.env.SFTP_BASE_DIR_VEHICLE_ENTRY || '', 
      String(entryId)
    );

    try {
      await this.sftpService.ensureDir(remoteDir);

      for (const file of files) {
        const remotePath = path.posix.join(remoteDir, file.originalname);
        
        await this.sftpService.put(file.buffer, remotePath);

        uploadedFiles.push({
          fileName: file.originalname,
          path: remotePath,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      
      return await this.prisma.vehicleEntry.update({
        where: { id: entryId },
        data: {
          attachments: uploadedFiles as unknown as Prisma.JsonArray,
          updatedBy: user?.name || 'System',
        },
      });

    } catch (error) {
      console.error('SFTP Upload Error:', error);
      throw new InternalServerErrorException('Failed to upload attachments');
    }
  }

  async getAttachments(entryId: number) {
    const entry = await this.prisma.vehicleEntry.findUnique({
      where: { id: entryId },
      select: { attachments: true },
    });

    if (!entry) {
      throw new NotFoundException(`Vehicle Entry with ID ${entryId} not found.`);
    }

    return (entry.attachments as any[]) || [];
  }

  async getAttachmentStream(entryId: number, fileName: string, res: any) {
    const entry = await this.prisma.vehicleEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entry not found');

    const attachments = (entry.attachments as any[]) || [];
    const fileData = attachments.find(a => a.fileName === fileName);
    
    if (!fileData) throw new NotFoundException('File not found in record');

    try {
      const stream = await this.sftpService.getStream(fileData.path);
      res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      
      if (Buffer.isBuffer(stream)) return res.end(stream);

      return (stream as NodeJS.ReadableStream).pipe(res);
      
    } catch (e) {
      throw new InternalServerErrorException('Could not retrieve file from storage');
    }
  }
}
