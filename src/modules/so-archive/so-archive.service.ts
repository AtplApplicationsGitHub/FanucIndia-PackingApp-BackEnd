import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SftpService } from '../sftp/sftp.service';
import { Prisma } from '@prisma/client';

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
        Dispatch_SO: {
          include: {
            dispatch: true,
          },
        },
      },
    });

    if (!so) {
      throw new NotFoundException(`Sales Order ${saleOrderNumber} not found.`);
    }

    if (so.status !== 'Dispatched') {
      throw new BadRequestException(`Sales Order ${saleOrderNumber} cannot be archived as its status is not 'Dispatched'.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const { id, updatedAt, materialData, materialFilesByNumber, Dispatch_SO, ...soData } = so;
      await tx.salesOrderArchive.create({ data: soData });

      if (so.materialData.length > 0) {
        await tx.eRP_Material_DataArchive.createMany({
          data: so.materialData.map(({ ID, ...d }) => d),
        });
      }

      if (so.materialFilesByNumber.length > 0) {
        await tx.eRP_Material_FileArchive.createMany({
          data: so.materialFilesByNumber.map(({ ID, updatedAt, ...f }) => f),
        });
      }
      
      const dispatches = so.Dispatch_SO.map(dso => dso.dispatch);
      if (dispatches.length > 0) {
        await tx.dispatchArchive.createMany({
            data: dispatches.map(({ id, updatedAt,...d }) => ({
              ...d,
              attachments: d.attachments ?? Prisma.DbNull, 
            })),
        });
        await tx.dispatch_SOArchive.createMany({
            data: so.Dispatch_SO.map(({ id, dispatch, ...dso }) => dso),
        });
      }

      await tx.dispatch_SO.deleteMany({ where: { saleOrderNumber } });
      await tx.dispatch.deleteMany({ where: { dispatchSOs: { some: { saleOrderNumber } } } });
      await tx.eRP_Material_File.deleteMany({ where: { saleOrderNumber } });
      await tx.eRP_Material_Data.deleteMany({ where: { saleOrderNumber } });
      await tx.salesOrder.delete({ where: { saleOrderNumber } });

      return { success: true, message: `Sales Order ${saleOrderNumber} has been successfully archived.` };
    });
  }

  async delete(saleOrderNumber: string) {
    const archivedSo = await this.prisma.salesOrderArchive.findFirst({
        where: { saleOrderNumber },
    });

    if (!archivedSo) {
        throw new NotFoundException(`Archived Sales Order ${saleOrderNumber} not found.`);
    }

    const archivedFiles = await this.prisma.eRP_Material_FileArchive.findMany({
      where: { saleOrderNumber },
    });

    for (const file of archivedFiles) {
      try {
        if (file.sftpPath) {
          await this.sftp.delete(file.sftpPath);
        }
      } catch (error) {
        console.warn(`Failed to delete SFTP file ${file.sftpPath}:`, error);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const dispatchSOArchives = await tx.dispatch_SOArchive.findMany({ where: { saleOrderNumber } });
      const dispatchIds = dispatchSOArchives.map(d => d.dispatchId);
      
      await tx.dispatch_SOArchive.deleteMany({ where: { saleOrderNumber } });
      if(dispatchIds.length > 0){
        await tx.dispatchArchive.deleteMany({ where: { id: { in: dispatchIds } } });
      }
      await tx.eRP_Material_FileArchive.deleteMany({ where: { saleOrderNumber } });
      await tx.eRP_Material_DataArchive.deleteMany({ where: { saleOrderNumber } });
      await tx.salesOrderArchive.deleteMany({ where: { saleOrderNumber } });

      return { success: true, message: `Archived Sales Order ${saleOrderNumber} has been permanently deleted.` };
    });
  }
}