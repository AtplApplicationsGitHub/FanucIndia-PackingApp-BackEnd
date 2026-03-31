import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
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