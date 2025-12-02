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

  // 1. SAVE API
  async create(dto: CreateVehicleEntryDto, userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.name || 'System';

    return this.prisma.vehicleEntry.create({
      data: {
        customerName: dto.customerName,
        vehicleNumber: dto.vehicleNumber,
        transporterName: dto.transporterName,
        driverNumber: dto.driverNumber,
        createdBy: userId,
        updatedBy: userName,
        attachments: Prisma.JsonNull,
      },
    });
  }

  // 2. UPLOAD API
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
        
        // Upload to SFTP
        await this.sftpService.put(file.buffer, remotePath);

        // Add metadata
        uploadedFiles.push({
          fileName: file.originalname,
          path: remotePath,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }

      // Update DB
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

    // Return the list of attachment objects (which contains fileName, path, etc.)
    return (entry.attachments as any[]) || [];
  }
}