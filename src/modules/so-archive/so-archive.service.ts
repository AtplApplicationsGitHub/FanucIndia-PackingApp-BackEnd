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
    const so = await this.prisma.salesOrder.findUnique({
      where: { saleOrderNumber },
      include: {
        materialData: true,
        materialFilesByNumber: true,
        statusStepper: true,
        Dispatch_SO: {
          include: {
            dispatch: {
              include: {
                _count: {
                  select: { dispatchSOs: true },
                },
                vehicleEntry: true, // [Updated] Include VehicleEntry to archive it
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

    return this.prisma.$transaction(async (tx) => {
      const {
        id,
        updatedAt,
        materialData,
        materialFilesByNumber,
        Dispatch_SO,
        statusStepper,
        ...soData
      } = so;

      // 1. Archive Sales Order
      await tx.salesOrderArchive.create({ data: soData });

      // 2. Archive Material Data
      if (materialData.length > 0) {
        await tx.eRP_Material_DataArchive.createMany({
          data: materialData.map(({ ID, ...d }) => d),
        });
      }

      // 3. Archive Material Files
      if (materialFilesByNumber.length > 0) {
        await tx.eRP_Material_FileArchive.createMany({
          data: materialFilesByNumber.map(({ ID, updatedAt, ...f }) => f),
        });
      }

      const dispatches = Dispatch_SO.map((dso) => dso.dispatch);
      
      // 4. Archive Vehicle Entries (New Logic)
      // Extract unique Vehicle Entries from the dispatches
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
          data: vehicleEntries.map(({ attachments, ...ve }) => ({
            ...ve,
            attachments: attachments ?? Prisma.DbNull,
          })),
          skipDuplicates: true,
        });
      }

      // 5. Archive Dispatches
      if (dispatches.length > 0) {
        await tx.dispatchArchive.createMany({
          data: dispatches.map(({ updatedAt, _count, vehicleEntry, ...d }) => ({
            ...d,
            transporterName: d.transporterName,
            attachments: d.attachments ?? Prisma.DbNull,
            // vehicleEntryId is included in 'd'
          })),
          skipDuplicates: true,
        });
        await tx.dispatch_SOArchive.createMany({
          data: Dispatch_SO.map(({ id, dispatch, ...dso }) => dso),
        });
      }

      // 6. Delete Original Records
      await tx.eRP_Material_File.deleteMany({ where: { saleOrderNumber } });
      await tx.eRP_Material_Data.deleteMany({ where: { saleOrderNumber } });
      await tx.dispatch_SO.deleteMany({ where: { saleOrderNumber } });

      // 7. Cleanup Dispatches and Vehicle Entries
      for (const dispatch of dispatches) {
        const totalSOsLinked = dispatch._count.dispatchSOs;
        // If this was the last SO for this dispatch, delete the dispatch
        if (totalSOsLinked <= 1) {
          await tx.dispatch.delete({ where: { id: dispatch.id } });

          // [Updated] Check if the linked Vehicle Entry is now orphan (no other active dispatches use it)
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
        await tx.sO_Status_Stepper.deleteMany({
          where: { salesOrderNumber: saleOrderNumber },
        });
      }

      await tx.salesOrder.delete({ where: { saleOrderNumber } });

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

    // --- 1. Identify Files to Delete ---

    // A. Material Files
    const materialFiles = await this.prisma.eRP_Material_FileArchive.findMany({
      where: { saleOrderNumber },
      select: { sftpPath: true, sftpDir: true },
    });

    // B. Identify Dispatches to delete (and their files)
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

    // C. Identify Vehicle Entries to delete (and their files) [Updated]
    const vehicleEntriesToDelete: { id: number; attachments: Prisma.JsonValue }[] = [];
    const uniqueVehicleEntryIds = [...new Set(dispatchesToDelete.map(d => d.vehicleEntryId).filter((id): id is number => !!id))];

    for (const veId of uniqueVehicleEntryIds) {
        // Count how many DispatchArchives *globally* use this VehicleEntryId
        const totalUsages = await this.prisma.dispatchArchive.count({
            where: { vehicleEntryId: veId }
        });

        // Count how many of those usages are being deleted right now
        const usagesBeingDeleted = dispatchesToDelete.filter(d => d.vehicleEntryId === veId).length;

        // If all usages are being deleted, then the VehicleEntry is orphan
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

    // Combine all files
    const allFilesToDelete = [...materialFiles, ...dispatchFiles, ...vehicleFiles];
    const uniqueDirectoriesToDelete = [
      ...new Set(allFilesToDelete.map((f) => f.sftpDir).filter(Boolean)),
    ];

    // --- 2. Database Deletion Transaction ---
    await this.prisma.$transaction(async (tx) => {
      // Delete Dispatches
      for (const d of dispatchesToDelete) {
         await tx.dispatchArchive.delete({ where: { id: d.id } });
      }

      // [Updated] Delete Vehicle Entries
      for (const ve of vehicleEntriesToDelete) {
         await tx.vehicleEntryArchive.delete({ where: { id: ve.id } });
      }

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
      await tx.salesOrderArchive.deleteMany({ where: { saleOrderNumber } });
    });

    // --- 3. SFTP Cleanup ---
    const orderBaseDir = process.env.SFTP_BASE_DIR_ORDER || '';
    const dispatchBaseDir = process.env.SFTP_BASE_DIR_DISPATCH || '';
    const vehicleBaseDir = process.env.SFTP_BASE_DIR_VEHICLE_ENTRY || ''; // [Updated]

    const resolvedOrderBase = path.posix.resolve(orderBaseDir);
    const resolvedDispatchBase = path.posix.resolve(dispatchBaseDir);
    const resolvedVehicleBase = path.posix.resolve(vehicleBaseDir); // [Updated]

    for (const file of allFilesToDelete) {
      try {
        if (file.sftpPath) {
          const resolvedPath = path.posix.resolve(file.sftpPath);

          // [Updated] Security check for Vehicle Entry path as well
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

          // [Updated] Security check for Vehicle Entry directory as well
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
        `inline; filename="${encodeURIComponent(file.fileName)}"`,
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
}