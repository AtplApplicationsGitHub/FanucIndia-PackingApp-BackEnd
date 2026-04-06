import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { CreateMobileDispatchDto } from './dto/create-mobile-dispatch.dto';
import { UpdateMobileDispatchDto } from './dto/update-mobile-dispatch.dto';
import { SftpService } from '../sftp/sftp.service';
import * as path from 'path';
import * as fs from 'fs';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import * as os from 'os';

export interface AttachmentData {
  fileName: string;
  path: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  private safeUnlink(filePath: string) {
    try {
      const resolvedPath = path.resolve(filePath);
      const tempDir = path.resolve(os.tmpdir());
      if (resolvedPath.startsWith(tempDir)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }

  private async getUserEmail(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.email || 'System';
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly sftpService: SftpService,
  ) {}

  async create(
    dto: CreateDispatchDto,
    files: Express.Multer.File[],
    userId: number,
  ) {
    const {
      transporterId: transporterIdString,
      vehicleNumber,
      saleOrderNumbers,
    } = dto;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const existingDispatchToday = await this.prisma.dispatch.findFirst({
      where: {
        vehicleNumber: vehicleNumber,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    if (existingDispatchToday) {
      throw new BadRequestException(
        `Vehicle Number '${vehicleNumber}' has already been used for a dispatch today. It can only be used again tomorrow.`
      );
    }

    const vehicleEntry = await this.prisma.vehicleEntry.findFirst({
      where: { 
        vehicleNumber: vehicleNumber,
        createdAt: { 
          gte: startOfToday,
          lte: endOfToday 
        } 
      },
      orderBy: { createdAt: 'desc' }, 
    });

    if (!vehicleEntry) {
      throw new BadRequestException(
        `Vehicle Number '${vehicleNumber}' not found in today's Vehicle Entry records. Please ensure a vehicle entry is created for today.`
      );
    }

    return this.prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({ where: { id: userId } });
      const userName = user?.email || 'System';

      const finalTransporterId = transporterIdString
        ? parseInt(transporterIdString, 10)
        : null;
      if (
        transporterIdString &&
        finalTransporterId !== null &&
        isNaN(finalTransporterId)
      ) {
        throw new BadRequestException('Invalid transporterId provided.');
      }
      if (finalTransporterId !== null) {
        const transporterExists = await tx.transporter.findUnique({
          where: { id: finalTransporterId },
        });
        if (!transporterExists) {
          throw new BadRequestException(
            `Transporter with ID ${finalTransporterId} not found.`,
          );
        }
      }

      const newDispatch = await tx.dispatch.create({
        data: {
          transporterId:
            finalTransporterId === null ? undefined : finalTransporterId,
          vehicleNumber,
          vehicleEntryId: vehicleEntry.id,
          createdBy: userId,
          UpdatedBy: userName,
          UpdatedDate: new Date(),
          attachments: Prisma.JsonNull,
        },
      });

      const uploadedAttachments: AttachmentData[] = [];
      if (files && files.length > 0) {
        const remoteDir = path.posix.join(
          process.env.SFTP_BASE_DIR_DISPATCH || '',
          String(newDispatch.id),
        );
        await this.sftpService.ensureDir(remoteDir);

        for (const file of files) {
          const remotePath = path.posix.join(remoteDir, file.originalname);
          await this.sftpService.put(file.buffer, remotePath);
          uploadedAttachments.push({
            fileName: file.originalname,
            path: remotePath,
            mimeType: file.mimetype,
            size: file.size,
          });
        }

        await tx.dispatch.update({
          where: { id: newDispatch.id },
          data: {
            attachments: uploadedAttachments as unknown as Prisma.JsonArray,
          },
        });
      }

      if (saleOrderNumbers && saleOrderNumbers.length > 0) {
        const dispatchSoData: { dispatchId: number; saleOrderNumber: string; salesOrderId: number }[] = [];

        for (const so of saleOrderNumbers) {
          const salesOrder = await tx.salesOrder.findFirst({
            where: { saleOrderNumber: so },
          });
          if (!salesOrder)
            throw new BadRequestException(`Sale Order ${so} not found.`);
          
          dispatchSoData.push({
            dispatchId: newDispatch.id,
            saleOrderNumber: so,
            salesOrderId: salesOrder.id, 
          });
        }

        await tx.dispatch_SO.createMany({
          data: dispatchSoData, 
        });

        const salesOrderIdsToUpdate = dispatchSoData.map(d => d.salesOrderId);

        await tx.salesOrder.updateMany({
          where: {
            id: { in: salesOrderIdsToUpdate },
          },
          data: {
            status: 'Dispatched',
            fgLocation: Prisma.DbNull,
          },
        });
      }

      return {
        ...newDispatch,
        attachments: uploadedAttachments as unknown as Prisma.JsonArray,
      };
    });
  }

  async findAttachmentsByDispatchId(dispatchId: number) {
    let dispatch: any = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { attachments: true },
    });

    if (!dispatch) {
      dispatch = await this.prisma.dispatchArchive.findUnique({
        where: { id: dispatchId },
        select: { attachments: true },
      });
    }

    if (!dispatch) {
      throw new NotFoundException(`Dispatch with ID ${dispatchId} not found.`);
    }

    return (dispatch.attachments as unknown as AttachmentData[] | null) || [];
  }

  async createMobileDispatchHeader(
    dto: CreateMobileDispatchDto,
    userId: number,
  ) {
    const {
      transporterId,
      transporterName,
      vehicleNumber,
    } = dto;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const existingDispatchToday = await this.prisma.dispatch.findFirst({
      where: {
        vehicleNumber: vehicleNumber,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    if (existingDispatchToday) {
      throw new BadRequestException(
        `Vehicle Number '${vehicleNumber}' has already been used for a dispatch today. It can only be used again tomorrow.`
      );
    }

    const vehicleEntry = await this.prisma.vehicleEntry.findFirst({
      where: { 
        vehicleNumber: vehicleNumber,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!vehicleEntry) {
      throw new BadRequestException(
        `Vehicle Number '${vehicleNumber}' not found in today's Vehicle Entry records. Please ensure a vehicle entry is created for today.`
      );
    }

    return this.prisma.$transaction(async (tx) => {

      let finalTransporterId: number | null = null;
      let finalTransporterName: string | null = null;

      if (transporterId) {
        finalTransporterId = Number(transporterId);
        const transporterExists = await tx.transporter.findUnique({
          where: { id: finalTransporterId },
        });
        if (!transporterExists) {
          throw new BadRequestException(
            `Transporter with ID ${transporterId} not found.`,
          );
        }
      } else if (transporterName) {
        finalTransporterName = transporterName;
      } else {
        finalTransporterId = null;
        finalTransporterName = null;
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      const userName = user?.email || 'System';

      const newDispatch = await tx.dispatch.create({
        data: {
          transporterId: finalTransporterId,
          transporterName: finalTransporterName,
          vehicleNumber,
          createdBy: userId,
          UpdatedBy: userName,
          UpdatedDate: new Date(),
          attachments: Prisma.JsonNull,
        },
      });

      return newDispatch;
    });
  }

  async addMobileAttachments(dispatchId: number, files: Express.Multer.File[]) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch) {
      throw new NotFoundException('Dispatch not found');
    }

    const existingAttachments =
      (dispatch.attachments as AttachmentData[] | null) || [];
    const newAttachments: AttachmentData[] = [];
    const remoteDir = path.posix.join(
      process.env.SFTP_BASE_DIR_DISPATCH || '',
      String(dispatchId),
    );

    try {
      await this.sftpService.ensureDir(remoteDir);
      for (const file of files) {
        const remotePath = path.posix.join(remoteDir, file.originalname);
        await this.sftpService.put(file.buffer, remotePath);
        newAttachments.push({
          fileName: file.originalname,
          path: remotePath,
          mimeType: file.mimetype,
          size: file.size,
        });
      }
    } catch (error) {
      files.forEach((file) => {
        try {
          this.safeUnlink(file.path);
        } catch {}
      });
      throw new InternalServerErrorException('Failed to upload attachments.');
    }

    const allAttachments = [...existingAttachments, ...newAttachments];
    return this.prisma.dispatch.update({
      where: { id: dispatchId },
      data: { attachments: allAttachments as unknown as Prisma.JsonArray },
    });
  }

  async addMobileDispatchSO(
    dispatchId: number,
    saleOrderNumber: string,
    userId: number,
  ) {
    const userName = await this.getUserEmail(userId);
    return this.prisma.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id: dispatchId },
      });
      if (!dispatch) {
        throw new NotFoundException('Dispatch record not found.');
      }

      const salesOrder = await tx.salesOrder.findFirst({
        where: {
          saleOrderNumber: {
            equals: saleOrderNumber,
            mode: 'insensitive',
          },
        },
      });

      if (!salesOrder) {
        throw new NotFoundException(
          `Sales Order '${saleOrderNumber}' not found.`,
        );
      }

     const createdLink = await tx.dispatch_SO.create({
        data: { 
          dispatchId, 
          saleOrderNumber: salesOrder.saleOrderNumber,
          salesOrderId: salesOrder.id // Fixed: passing the foreign key
        },
      });

      await tx.dispatch.update({
        where: { id: dispatchId },
        data: {
          UpdatedDate: new Date(),
        },
      });

      await tx.salesOrder.update({ 
        where: { id: salesOrder.id },
        data: {
          assignedUserId: null,
          status: 'Dispatched',
          fgLocation: Prisma.DbNull,
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
      });

      await tx.sO_Status_Stepper.updateMany({
        where: {
          salesOrderNumber: salesOrder.saleOrderNumber,
          status: "Dispatched"
        },
        data: {
          createdDateTime: new Date(),
          updatedBy: userName,
        }
      });

      return createdLink;
    });
  }

  async findAll(startDate?: string, endDate?: string) {
    const activeWhere: Prisma.DispatchWhereInput = {};
    const archiveWhere: any = {};

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);

      activeWhere.createdAt = {
        gte: start,
        lte: end,
      };
      archiveWhere.createdAt = {
        gte: start,
        lte: end,
      };
    }

    // 1. Fetch Active Dispatches
    const activeDispatches = await this.prisma.dispatch.findMany({
      where: activeWhere,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        transporterId: true,
        transporterName: true,
        vehicleNumber: true,
        attachments: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        UpdatedBy: true,
        UpdatedDate: true,
        transporter: { select: { name: true } },
        _count: {
          select: { dispatchSOs: true },
        },
      },
    });

    const mappedActive = activeDispatches.map((d) => ({
      ...d,
      soCount: d._count.dispatchSOs,
    }));

    // 2. Fetch Archived Dispatches
    const archivedDispatches = await this.prisma.dispatchArchive.findMany({
      where: archiveWhere,
      orderBy: { createdAt: 'desc' },
    });

    let mappedArchived: any[] = [];
    if (archivedDispatches.length > 0) {
      const archiveIds = archivedDispatches.map(a => a.id);
      
      // Get counts of SOs mapped to archived dispatches
      const archivedSOCounts = await this.prisma.dispatch_SOArchive.groupBy({
        by: ['dispatchId'],
        where: { dispatchId: { in: archiveIds } },
        _count: { id: true }
      });
      const archivedSOCountMap = new Map(archivedSOCounts.map(c => [c.dispatchId, c._count.id]));

      // Map transporter names for archives
      const transporterIds = [...new Set(archivedDispatches.map(a => a.transporterId).filter(Boolean))] as number[];
      let transporterMap = new Map<number, string>();
      
      if (transporterIds.length > 0) {
        const transporters = await this.prisma.transporter.findMany({
          where: { id: { in: transporterIds } },
          select: { id: true, name: true }
        });
        transporterMap = new Map(transporters.map(t => [t.id, t.name]));
      }

      mappedArchived = archivedDispatches.map(d => ({
        id: d.id,
        transporterId: d.transporterId,
        transporterName: d.transporterName,
        vehicleNumber: d.vehicleNumber,
        attachments: d.attachments,
        createdBy: d.createdBy,
        createdAt: d.createdAt,
        updatedAt: d.UpdatedDate || d.createdAt,
        UpdatedBy: d.UpdatedBy,
        UpdatedDate: d.UpdatedDate,
        transporter: d.transporterId ? { name: transporterMap.get(d.transporterId) || d.transporterName } : null,
        soCount: archivedSOCountMap.get(d.id) || 0,
        isArchived: true // helps frontend know this is historical
      }));
    }

    // 3. Combine and Sort
    return [...mappedActive, ...mappedArchived].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(id: number, dto: UpdateDispatchDto, userId: number) {
    const { transporterId, vehicleNumber } = dto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const existingDispatch = await this.prisma.dispatch.findUnique({ where: { id } });
    if (!existingDispatch) {
      throw new NotFoundException(`Dispatch with ID ${id} not found.`);
    }

    if (vehicleNumber) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const existingDispatchToday = await this.prisma.dispatch.findFirst({
        where: {
          vehicleNumber: vehicleNumber,
          id: { not: id },
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });

      if (existingDispatchToday) {
        throw new BadRequestException(
          `Vehicle Number '${vehicleNumber}' is already assigned to another dispatch today. Please use a different vehicle.`
        );
      }
    }

    return this.prisma.dispatch.update({
      where: { id },
      data: {
        transporterId: transporterId ? Number(transporterId) : undefined,
        vehicleNumber,
        UpdatedBy: user?.email || 'System',
        UpdatedDate: new Date(),
      },
    });
  }

  async updateMobileDispatch(dispatchId: number, dto: UpdateMobileDispatchDto, userId: number) {
    const {
      transporterId,
      transporterName,
      vehicleNumber,
    } = dto;

    if (vehicleNumber) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const existingDispatchToday = await this.prisma.dispatch.findFirst({
        where: {
          vehicleNumber: vehicleNumber,
          id: { not: dispatchId }, // Exclude the current dispatch being updated
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });

      if (existingDispatchToday) {
        throw new BadRequestException(
          `Vehicle Number '${vehicleNumber}' is already assigned to another dispatch today. Please use a different vehicle.`
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findUnique({ where: { id: dispatchId } });
      if (!dispatch) {
        throw new NotFoundException(`Dispatch with ID ${dispatchId} not found.`);
      }

      let finalTransporterId: number | null = null;
      let finalTransporterName: string | null = null;

      if (transporterId) {
        finalTransporterId = Number(transporterId);
        const transporterExists = await tx.transporter.findUnique({ where: { id: finalTransporterId } });
        if (!transporterExists) {
          throw new BadRequestException(`Transporter with ID ${transporterId} not found.`);
        }
      } else if (transporterName) {
        finalTransporterName = transporterName;
      } else {
        finalTransporterId = null;
        finalTransporterName = null;
      }

      const userName = await this.getUserEmail(userId);

      const updatedDispatch = await tx.dispatch.update({
        where: { id: dispatchId },
        data: {
          transporterId: finalTransporterId, 
          transporterName: finalTransporterName,
          vehicleNumber: vehicleNumber,
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
        include: { 
          transporter: true,
        }
      });

      return updatedDispatch;
    });
  }

  async findDispatchSOs(dispatchId: number) {
    // 1. Check Active
    const activeSOs = await this.prisma.dispatch_SO.findMany({
      where: { dispatchId },
      orderBy: { createdAt: 'asc' },
      include: {
        salesOrder: {
          select: {
            customerNameText: true,
            customer: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (activeSOs.length > 0) {
      return activeSOs;
    }

    // 2. Check Archive
    const archivedSOs = await this.prisma.dispatch_SOArchive.findMany({
      where: { dispatchId },
      orderBy: { createdAt: 'asc' },
    });

    if (archivedSOs.length > 0) {
      const soIds = archivedSOs.map(so => so.salesOrderId);
      
      // Match archived SOs with customer details from either SalesOrder or SalesOrderArchive
      const soArchives = await this.prisma.salesOrderArchive.findMany({
        where: { id: { in: soIds } },
        select: { id: true, customerNameText: true, customer: { select: { name: true } } }
      });
      
      const activeSosForArchive = await this.prisma.salesOrder.findMany({
          where: { id: { in: soIds } },
          select: { id: true, customerNameText: true, customer: { select: { name: true } } }
      });

      const combinedSOs = [...soArchives, ...activeSosForArchive];
      const soMap = new Map(combinedSOs.map(so => [so.id, so]));

      return archivedSOs.map(so => ({
        ...so,
        salesOrder: soMap.get(so.salesOrderId) || null,
      }));
    }

    return [];
  }
  
  async addDispatchSO(
    dispatchId: number,
    saleOrderNumber: string,
    userId: number,
  ) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });

    if (!dispatch) {
      throw new NotFoundException('Dispatch record not found.');
    }

    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: {
        saleOrderNumber: {
          equals: saleOrderNumber,
          mode: 'insensitive',
        },
      },
      select: { id: true, saleOrderNumber: true },
    });

    if (!salesOrder) {
      throw new NotFoundException('Invalid SO Number');
    }

    const userName = await this.getUserEmail(userId);

    return this.prisma.$transaction(async (tx) => {
      try {
        const newDispatchSO = await tx.dispatch_SO.create({
          data: {
            dispatchId,
            saleOrderNumber: salesOrder.saleOrderNumber,
            salesOrderId: salesOrder.id,
          },
        });

        await tx.dispatch.update({
          where: { id: dispatchId },
          data: {
            UpdatedDate: new Date(),
          },
        });

        await tx.salesOrder.update({
          where: { id: salesOrder.id },
          data: {
            assignedUserId: null,
            status: 'Dispatched',
            fgLocation: Prisma.DbNull, 
            UpdatedBy: userName,
            UpdatedDate: new Date(),
          },
        });

        await tx.sO_Status_Stepper.updateMany({
          where: {
            salesOrderNumber: salesOrder.saleOrderNumber,
            status: "Dispatched"
          },
          data: {
            createdDateTime: new Date(),
            updatedBy: userName,
          }
        });

        return newDispatchSO;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException('SO Number already added.');
        }
        throw error;
      }
    });
  }

  async removeDispatchSO(soId: number, userId: number) {
    const dispatchSoLink = await this.prisma.dispatch_SO.findUnique({
      where: { id: soId },
    });

    if (!dispatchSoLink) {
      throw new NotFoundException('Dispatch link not found.');
    }

    const userName = await this.getUserEmail(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.dispatch_SO.delete({ where: { id: soId } });

      await tx.salesOrder.update({ 
        where: { id: dispatchSoLink.salesOrderId },
        data: {
          status: 'F105',
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
      });

      await tx.dispatch.update({
        where: { id: dispatchSoLink.dispatchId },
        data: {
          UpdatedDate: new Date(),
        },
      });
    });

    return { message: 'SO Number removed and status reverted to F105' };
  }

  async generatePdf(dispatchId: number): Promise<Buffer> {
    let dispatch: any = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        dispatchSOs: {
          select: {
            saleOrderNumber: true,
          },
        },
      },
    });

    if (!dispatch) {
      const dispatchArch = await this.prisma.dispatchArchive.findUnique({
        where: { id: dispatchId }
      });
      if (dispatchArch) {
         const dispatchSOs = await this.prisma.dispatch_SOArchive.findMany({
           where: { dispatchId },
           select: { saleOrderNumber: true }
         });
         dispatch = { ...dispatchArch, dispatchSOs };
      }
    }

    if (!dispatch) {
      throw new NotFoundException('Dispatch not found');
    }

    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.fontSize(20).text('Dispatch Note', { align: 'center' });
    doc.moveDown();

    const tableTop = doc.y;
    const itemHeight = 25;
    const col1X = 50; 
    const col2X = 150;
    const col1Width = 100;
    const col2Width = 200;

    doc.rect(col1X, tableTop, col1Width + col2Width, itemHeight)
       .fillAndStroke('#FFD200', '#000000'); 

    doc.fillColor('#000000').font('Helvetica-Bold');
    doc.text('S.No', col1X + 10, tableTop + 8);
    doc.text('Sale Order Number', col2X + 10, tableTop + 8);
    
    doc.font('Helvetica');

    dispatch.dispatchSOs.forEach((so: any, index: number) => {
      const y = tableTop + itemHeight + (index * itemHeight);
      
      const bgColor = index % 2 === 0 ? '#FFF4CC' : '#FFFFFF'; 
      
      doc.rect(col1X, y, col1Width + col2Width, itemHeight)
         .fillAndStroke(bgColor, '#000000');

      doc.fillColor('#000000');
      doc.text(String(index + 1), col1X + 10, y + 8);
      doc.text(so.saleOrderNumber, col2X + 10, y + 8);
    });

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.end();
    });
  }

  async addAttachments(dispatchId: number, files: Express.Multer.File[]) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch) {
      throw new NotFoundException('Dispatch not found');
    }

    const existingAttachments =
      (dispatch.attachments as AttachmentData[] | null) || [];
    const newAttachments: AttachmentData[] = [];

    const remoteDir = path.posix.join(
      process.env.SFTP_BASE_DIR_DISPATCH || '',
      String(dispatchId),
    );
    await this.sftpService.ensureDir(remoteDir);

    for (const file of files) {
      const remotePath = path.posix.join(remoteDir, file.originalname);
      await this.sftpService.put(file.buffer, remotePath);
      newAttachments.push({
        fileName: file.originalname,
        path: remotePath,
        mimeType: file.mimetype,
        size: file.size,
      });
    }

    const allAttachments = [...existingAttachments, ...newAttachments];

    return this.prisma.dispatch.update({
      where: { id: dispatchId },
      data: { attachments: allAttachments as unknown as Prisma.JsonArray },
    });
  }

  async deleteAttachment(dispatchId: number, fileName: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch) {
      throw new NotFoundException('Dispatch not found');
    }

    const attachments = (dispatch.attachments as AttachmentData[] | null) || [];
    const attachmentToDelete = attachments.find(
      (att) => att.fileName === fileName,
    );

    if (!attachmentToDelete) {
      throw new NotFoundException('Attachment not found');
    }

    try {
      await this.sftpService.delete(attachmentToDelete.path);
    } catch (error) {
      console.error(
        `SFTP delete failed for ${attachmentToDelete.path}, but proceeding with DB update.`,
      );
    }

    const updatedAttachments = attachments.filter(
      (att) => att.fileName !== fileName,
    );

    return this.prisma.dispatch.update({
      where: { id: dispatchId },
      data: { attachments: updatedAttachments as unknown as Prisma.JsonArray },
    });
  }

  async getAttachmentStream(dispatchId: number, fileName: string) {
    let dispatch: any = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });

    if (!dispatch) {
      dispatch = await this.prisma.dispatchArchive.findUnique({
        where: { id: dispatchId },
      });
    }

    if (!dispatch) {
      throw new NotFoundException('Dispatch not found');
    }

    const attachments = (dispatch.attachments as AttachmentData[] | null) || [];
    const attachment = attachments.find((att) => att.fileName === fileName);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    try {
      const streamOrBuffer = await this.sftpService.getStream(attachment.path);

      let stream;
      if (Buffer.isBuffer(streamOrBuffer)) {
        const { Readable } = require('stream');
        stream = Readable.from(streamOrBuffer);
      } else {
        stream = streamOrBuffer;
      }

      return { stream, mimeType: attachment.mimeType };
    } catch (error) {
      console.error('SFTP stream error:', error);
      throw new NotFoundException('File not found on storage server.');
    }
  }
}
