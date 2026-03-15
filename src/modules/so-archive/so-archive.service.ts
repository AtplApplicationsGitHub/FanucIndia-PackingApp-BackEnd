import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SftpService } from '../sftp/sftp.service';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import * as path from 'path';

@Injectable()
export class SoArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sftp: SftpService,
  ) {}

  async archive(saleOrderNumber: string) {
    const so = await this.prisma.salesOrder.findFirst({
      where: { saleOrderNumber },
      include: {
        materialData: true,
        materialFilesByNumber: true,
        statusStepper: true,
        chatMessages: true,
        soChatNotifications: true,
        Dispatch_SO: {
          include: {
            dispatch: {
              include: {
                _count: {
                  select: { dispatchSOs: true },
                },
                vehicleEntry: true, 
              },
            },
          },
        },
      },
    });

    if (!so) {
      throw new NotFoundException(`Sales Order ${saleOrderNumber} not found.`);
    }

    if (so.status !== 'Dispatched') {
      throw new BadRequestException(
        `Sales Order ${saleOrderNumber} cannot be archived as its status is not 'Dispatched'.`,
      );
    }

    const materialLogs = await this.prisma.eRPMaterialLog.findMany({
      where: { soNo: saleOrderNumber },
    });

    return this.prisma.$transaction(async (tx) => {
      const remainingActiveOrders = await tx.salesOrder.count({
        where: {
          saleOrderNumber: so.saleOrderNumber,
          id: { not: so.id },
        },
      });

      const {
        id,
        updatedAt,
        materialData,
        materialFilesByNumber,
        Dispatch_SO,
        statusStepper,
        chatMessages,
        soChatNotifications,
        ...soData
      } = so;

      await tx.salesOrderArchive.create({ 
        data: {
          ...soData,
          transferOrder: soData.transferOrder ?? '',
          packConfigId: soData.packConfigId ?? 0,
          fgLocation: soData.fgLocation ?? Prisma.DbNull
        } 
      });

      if (materialLogs.length > 0) {
        await tx.eRPMaterialLogArchive.createMany({
          data: materialLogs.map((log) => ({
            ...log,
            archivedAt: new Date(),
          })),
        });

        if (remainingActiveOrders === 0) {
          await tx.eRPMaterialLog.deleteMany({
            where: { soNo: saleOrderNumber },
          });
        }
      }

      if (materialData.length > 0) {
        await tx.eRP_Material_DataArchive.createMany({
          data: materialData.map(({ ID, ...d }) => d),
        });
      }

      if (materialFilesByNumber.length > 0) {
        await tx.eRP_Material_FileArchive.createMany({
          data: materialFilesByNumber.map(({ ID, updatedAt, ...f }) => f),
        });
      }

      // Archive Chat Messages
      if (chatMessages && chatMessages.length > 0) {
        await tx.salesOrderChatMessageArchive.createMany({
          data: chatMessages.map((msg) => ({
            id: msg.id, 
            salesOrderNumber: so.saleOrderNumber, 
            salesOrderId: so.id, // Fix: Added missing required field
            fromUserId: msg.fromUserId,
            toUserId: msg.toUserId,
            message: msg.message,
            createdAt: msg.createdAt,
          })),
        });
      }

      // Archive Chat Notifications
      if (soChatNotifications && soChatNotifications.length > 0) {
        await tx.soChatNotificationArchive.createMany({
          data: soChatNotifications.map((notif) => ({
            id: notif.id,
            salesOrderNumber: so.saleOrderNumber,
            salesOrderId: so.id,
            userId: notif.userId,
            messageId: notif.messageId,
            createdAt: notif.createdAt,
          })),
        });
      }

      const dispatches = Dispatch_SO.map((dso) => dso.dispatch);
      
      const vehicleEntries = [
        ...new Map(
          dispatches
            .map((d) => d.vehicleEntry)
            .filter((ve): ve is NonNullable<typeof ve> => !!ve)
            .map((ve) => [ve.id, ve])
        ).values(),
      ];

      if (vehicleEntries.length > 0) {
        await tx.vehicleEntryArchive.createMany({
          data: vehicleEntries.map((ve) => ({
            id: ve.id,
            customerName: ve.customerName,
            vehicleNumber: ve.vehicleNumber,
            transporterName: ve.transporterName,
            driverNumber: ve.driverNumber,
            createdBy: ve.createdBy,
            createdAt: ve.createdAt,
            updatedBy: ve.updatedBy,
            updatedAt: ve.updatedAt,
            attachments: ve.attachments ?? Prisma.DbNull,
          })),
          skipDuplicates: true,
        });
      }

      if (dispatches.length > 0) {
        await tx.dispatchArchive.createMany({
          data: dispatches.map(({ updatedAt, _count, vehicleEntry, ...d }) => ({
            ...d,
            transporterName: d.transporterName,
            attachments: d.attachments ?? Prisma.DbNull,
          })),
          skipDuplicates: true,
        });
        await tx.dispatch_SOArchive.createMany({
          data: Dispatch_SO.map(({ id, dispatch, ...dso }) => dso),
        });
      }

      if (remainingActiveOrders === 0) {
        await tx.eRP_Material_File.deleteMany({ where: { saleOrderNumber } });
        await tx.eRP_Material_Data.deleteMany({ where: { saleOrderNumber } });
      }
      await tx.dispatch_SO.deleteMany({ where: { salesOrderId: so.id } });

      for (const dispatch of dispatches) {
        const totalSOsLinked = dispatch._count.dispatchSOs;
        if (totalSOsLinked <= 1) {
          await tx.dispatch.delete({ where: { id: dispatch.id } });

          if (dispatch.vehicleEntryId) {
            const activeUsageCount = await tx.dispatch.count({
              where: { vehicleEntryId: dispatch.vehicleEntryId },
            });
            
            if (activeUsageCount === 0) {
              await tx.vehicleEntry.delete({ where: { id: dispatch.vehicleEntryId } });
            }
          }
        }
      }

      if (so.statusStepper.length > 0) {
        await tx.sO_Status_StepperArchive.createMany({
          data: so.statusStepper.map(({ id, salesOrderNumber, ...d }) => ({
            ...d,
            salesOrderNumber: so.saleOrderNumber,
          })),
        });
        if (remainingActiveOrders === 0) {
          await tx.sO_Status_Stepper.deleteMany({
            where: { salesOrderNumber: saleOrderNumber },
          });
        }
      }

      await tx.salesOrder.delete({ where: { id: so.id } });

      return {
        success: true,
        message: `Sales Order ${saleOrderNumber} has been successfully archived.`,
      };
    });
  }

  async delete(saleOrderNumber: string) {
    const archivedSo = await this.prisma.salesOrderArchive.findFirst({
      where: { saleOrderNumber },
    });

    if (!archivedSo) {
      throw new NotFoundException(
        `Archived Sales Order ${saleOrderNumber} not found.`,
      );
    }

    const materialFiles = await this.prisma.eRP_Material_FileArchive.findMany({
      where: { saleOrderNumber },
      select: { sftpPath: true, sftpDir: true },
    });

    const dispatchSOArchives = await this.prisma.dispatch_SOArchive.findMany({
      where: { saleOrderNumber },
      select: { dispatchId: true },
    });
    const dispatchIds = [
      ...new Set(dispatchSOArchives.map((d) => d.dispatchId)),
    ];

    const dispatchesToDelete: { id: number; attachments: Prisma.JsonValue; vehicleEntryId: number | null }[] = [];
    
    for (const dispatchId of dispatchIds) {
      const remainingLinks = await this.prisma.dispatch_SOArchive.count({
        where: {
          dispatchId: dispatchId,
          NOT: { saleOrderNumber: saleOrderNumber },
        },
      });

      if (remainingLinks === 0) {
        const dispatchArchive = await this.prisma.dispatchArchive.findUnique({
          where: { id: dispatchId },
          select: { id: true, attachments: true, vehicleEntryId: true },
        });
        if (dispatchArchive) {
          dispatchesToDelete.push(dispatchArchive);
        }
      }
    }

    const dispatchFiles = dispatchesToDelete
      .flatMap((d) => d.attachments as any[] | null)
      .filter((att) => att && att.path)
      .map((att) => ({
        sftpPath: att.path,
        sftpDir: att.path.substring(0, att.path.lastIndexOf('/')),
      }));

    const vehicleEntriesToDelete: { id: number; attachments: Prisma.JsonValue }[] = [];
    const uniqueVehicleEntryIds = [...new Set(dispatchesToDelete.map(d => d.vehicleEntryId).filter((id): id is number => !!id))];

    for (const veId of uniqueVehicleEntryIds) {
        const totalUsages = await this.prisma.dispatchArchive.count({
            where: { vehicleEntryId: veId }
        });

        const usagesBeingDeleted = dispatchesToDelete.filter(d => d.vehicleEntryId === veId).length;

        if (totalUsages === usagesBeingDeleted) {
            const veArchive = await this.prisma.vehicleEntryArchive.findUnique({
                where: { id: veId },
                select: { id: true, attachments: true }
            });
            if (veArchive) {
                vehicleEntriesToDelete.push(veArchive);
            }
        }
    }

    const vehicleFiles = vehicleEntriesToDelete
      .flatMap((ve) => ve.attachments as any[] | null)
      .filter((att) => att && att.path)
      .map((att) => ({
        sftpPath: att.path,
        sftpDir: att.path.substring(0, att.path.lastIndexOf('/')),
      }));

    const allFilesToDelete = [...materialFiles, ...dispatchFiles, ...vehicleFiles];
    const uniqueDirectoriesToDelete = [
      ...new Set(allFilesToDelete.map((f) => f.sftpDir).filter(Boolean)),
    ];

    await this.prisma.$transaction(async (tx) => {
      for (const d of dispatchesToDelete) {
         await tx.dispatchArchive.delete({ where: { id: d.id } });
      }

      for (const ve of vehicleEntriesToDelete) {
         await tx.vehicleEntryArchive.delete({ where: { id: ve.id } });
      }

      await tx.eRPMaterialLogArchive.deleteMany({
        where: { soNo: saleOrderNumber },
      });

      await tx.dispatch_SOArchive.deleteMany({ where: { saleOrderNumber } });
      await tx.eRP_Material_FileArchive.deleteMany({
        where: { saleOrderNumber },
      });
      await tx.eRP_Material_DataArchive.deleteMany({
        where: { saleOrderNumber },
      });
      await tx.sO_Status_StepperArchive.deleteMany({
        where: { salesOrderNumber: saleOrderNumber },
      });
      await tx.salesOrderChatMessageArchive.deleteMany({
        where: { salesOrderNumber: saleOrderNumber },
      });
      await tx.soChatNotificationArchive.deleteMany({
        where: { salesOrderNumber: saleOrderNumber },
      });
      await tx.salesOrderArchive.deleteMany({ where: { saleOrderNumber } });
    });

    const orderBaseDir = process.env.SFTP_BASE_DIR_ORDER || '';
    const dispatchBaseDir = process.env.SFTP_BASE_DIR_DISPATCH || '';
    const vehicleBaseDir = process.env.SFTP_BASE_DIR_VEHICLE_ENTRY || ''; 

    const resolvedOrderBase = path.posix.resolve(orderBaseDir);
    const resolvedDispatchBase = path.posix.resolve(dispatchBaseDir);
    const resolvedVehicleBase = path.posix.resolve(vehicleBaseDir); 

    for (const file of allFilesToDelete) {
      try {
        if (file.sftpPath) {
          const resolvedPath = path.posix.resolve(file.sftpPath);

          if (
            !resolvedPath.startsWith(resolvedOrderBase) &&
            !resolvedPath.startsWith(resolvedDispatchBase) &&
            !resolvedPath.startsWith(resolvedVehicleBase)
          ) {
            console.warn(
              `Skipping delete: Path ${file.sftpPath} is outside of configured base directories.`,
            );
            continue;
          }

          await this.sftp.delete(file.sftpPath);
        }
      } catch (error) {
        console.warn(`Failed to clean up SFTP file ${file.sftpPath}:`, error);
      }
    }

    for (const dir of uniqueDirectoriesToDelete) {
      try {
        if (dir) {
          const resolvedDir = path.posix.resolve(dir);

          const orderBasePrefix = resolvedOrderBase.endsWith('/') ? resolvedOrderBase : resolvedOrderBase + '/';
          const dispatchBasePrefix = resolvedDispatchBase.endsWith('/') ? resolvedDispatchBase : resolvedDispatchBase + '/';
          const vehicleBasePrefix = resolvedVehicleBase.endsWith('/') ? resolvedVehicleBase : resolvedVehicleBase + '/';

          if (
            resolvedDir !== resolvedOrderBase && !resolvedDir.startsWith(orderBasePrefix) &&
            resolvedDir !== resolvedDispatchBase && !resolvedDir.startsWith(dispatchBasePrefix) &&
            resolvedDir !== resolvedVehicleBase && !resolvedDir.startsWith(vehicleBasePrefix)
          ) {
            console.warn(
              `Skipping rmdir: Path ${dir} is outside of configured base directories.`,
            );
            continue;
          }

          await this.sftp.rmdir(dir);
        }
      } catch (error) {
        console.warn(`Failed to clean up SFTP directory ${dir}:`, error);
      }
    }

    return {
      success: true,
      message: `Archived Sales Order ${saleOrderNumber} has been permanently deleted.`,
    };
  }

  async downloadArchivedFile(fileId: number, res: Response) {
    const file = await this.prisma.eRP_Material_FileArchive.findUnique({
      where: { ID: fileId },
    });

    if (!file) {
      throw new NotFoundException('Archived file not found.');
    }

    try {
      const data = await this.sftp.getStream(file.sftpPath);
      res.setHeader(
        'Content-Type',
        file.mimeType ?? 'application/octet-stream',
      );
      
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.fileName}"`,
      );
      
      if (file.fileSizeBytes) {
        res.setHeader('Content-Length', String(file.fileSizeBytes));
      }

      if (Buffer.isBuffer(data)) {
        return res.end(data);
      }
      (data as NodeJS.ReadableStream).pipe(res);
    } catch (error) {
      console.error('SFTP download error for archived file:', error);
      res.status(404).send('File not found in storage.');
    }
  }

  async downloadDispatchFile(dispatchId: number, fileName: string, res: Response) {
    const dispatch = await this.prisma.dispatchArchive.findUnique({
      where: { id: dispatchId },
    });

    if (!dispatch) {
      throw new NotFoundException('Archived Dispatch not found.');
    }

    const attachments = (dispatch.attachments as any[]) || [];
    const file = attachments.find((f) => f.fileName === fileName);

    if (!file) {
      throw new NotFoundException('Attachment not found in archive.');
    }

    return this.streamFile(file, res);
  }

  async downloadVehicleFile(vehicleId: number, fileName: string, res: Response) {
    const entry = await this.prisma.vehicleEntryArchive.findUnique({
      where: { id: vehicleId },
    });

    if (!entry) {
      throw new NotFoundException('Archived Vehicle Entry not found.');
    }

    const attachments = (entry.attachments as any[]) || [];
    const file = attachments.find((f) => f.fileName === fileName);

    if (!file) {
      throw new NotFoundException('Attachment not found in archive.');
    }

    return this.streamFile(file, res);
  }

  private async streamFile(file: any, res: Response) {
    try {
      const filePath = file.path || file.sftpPath;
      const fileSize = file.size || file.fileSizeBytes;

      const data = await this.sftp.getStream(filePath);
      
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      
      if (fileSize) {
        res.setHeader('Content-Length', String(fileSize));
      }

      if (Buffer.isBuffer(data)) {
        return res.end(data);
      }
      (data as NodeJS.ReadableStream).pipe(res);
    } catch (error) {
      console.error('SFTP download error:', error);
      res.status(404).send('File not found in storage.');
    }
  }
}