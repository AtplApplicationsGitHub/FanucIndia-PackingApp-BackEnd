import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { CreateMobileDispatchDto } from './dto/create-mobile-dispatch.dto';
import { SftpService } from '../sftp/sftp.service';
import * as path from 'path';
import * as fs from 'fs';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';

interface AttachmentData {
  fileName: string;
  path: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class DispatchService {
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
      customerId,
      address,
      transporterId,
      vehicleNumber,
      saleOrderNumbers,
    } = dto;

    return this.prisma.$transaction(async (tx) => {
      const uploadedAttachments: AttachmentData[] = [];
      if (files && files.length > 0) {
        const remoteDir = path.posix.join(
          process.env.SFTP_BASE_DIR || '',
          `${Date.now()}`,
        );
        await this.sftpService.ensureDir(remoteDir);

        for (const file of files) {
          const remotePath = path.posix.join(remoteDir, file.filename);
          await this.sftpService.put(file.path, remotePath);
          uploadedAttachments.push({
            fileName: file.originalname,
            path: remotePath,
            mimeType: file.mimetype,
            size: file.size,
          });
          fs.unlinkSync(file.path);
        }
      }

      const newDispatch = await tx.dispatch.create({
        data: {
          customerId: Number(customerId),
          address,
          transporterId: transporterId ? Number(transporterId) : null,
          vehicleNumber,
          createdBy: userId,
          attachments:
            uploadedAttachments.length > 0
              ? (uploadedAttachments as unknown as Prisma.JsonArray)
              : Prisma.JsonNull,
        },
      });

      if (saleOrderNumbers && saleOrderNumbers.length > 0) {
        for (const so of saleOrderNumbers) {
          const salesOrder = await tx.salesOrder.findUnique({
            where: { saleOrderNumber: so },
          });
          if (!salesOrder)
            throw new BadRequestException(`Sale Order ${so} not found.`);
          if (salesOrder.customerId !== Number(customerId))
            throw new BadRequestException(
              `Sale Order ${so} belongs to a different customer.`,
            );
        }

        await tx.dispatch_SO.createMany({
          data: saleOrderNumbers.map((so) => ({
            dispatchId: newDispatch.id,
            saleOrderNumber: so,
          })),
        });

        await tx.salesOrder.updateMany({
          where: {
            saleOrderNumber: { in: saleOrderNumbers },
          },
          data: {
            status: 'Dispatched',
          },
        });
      }

      return newDispatch;
    });
  }

  async createMobileDispatchHeader(
    dto: CreateMobileDispatchDto,
    userId: number,
  ) {
    const {
      customerId,
      customerName,
      address,
      transporterId,
      transporterName,
      vehicleNumber,
    } = dto;

    return this.prisma.$transaction(async (tx) => {
      let finalCustomerId: number;
      let finalTransporterId: number;

      if (customerId) {
        finalCustomerId = Number(customerId);
        const customerExists = await tx.customer.findUnique({
          where: { id: finalCustomerId },
        });
        if (!customerExists) {
          throw new BadRequestException(
            `Customer with ID ${customerId} not found.`,
          );
        }
      } else if (customerName) {
        let customer = await tx.customer.findFirst({
          where: { name: { equals: customerName, mode: 'insensitive' } },
        });
        if (!customer) {
          customer = await tx.customer.create({
            data: { name: customerName, address: address },
          });
        }
        finalCustomerId = customer.id;
      } else {
        throw new BadRequestException(
          'Either customerId or customerName must be provided.',
        );
      }

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
        let transporter = await tx.transporter.findFirst({
          where: { name: { equals: transporterName, mode: 'insensitive' } },
        });
        if (!transporter) {
          transporter = await tx.transporter.create({
            data: { name: transporterName },
          });
        }
        finalTransporterId = transporter.id;
      } else {
        throw new BadRequestException(
          'Either transporterId or transporterName must be provided.',
        );
      }

      const newDispatch = await tx.dispatch.create({
        data: {
          customerId: finalCustomerId,
          address,
          transporterId: finalTransporterId,
          vehicleNumber,
          createdBy: userId,
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
        await this.sftpService.put(file.path, remotePath);
        newAttachments.push({
          fileName: file.originalname,
          path: remotePath,
          mimeType: file.mimetype,
          size: file.size,
        });
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      files.forEach((file) => {
        try {
          fs.unlinkSync(file.path);
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

  async addMobileDispatchSO(dispatchId: number, saleOrderNumber: string) {
    return this.prisma.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id: dispatchId },
      });
      if (!dispatch) {
        throw new NotFoundException('Dispatch record not found.');
      }

      const salesOrder = await tx.salesOrder.findUnique({
        where: { saleOrderNumber },
      });
      if (!salesOrder) {
        throw new NotFoundException(
          `Sales Order '${saleOrderNumber}' not found.`,
        );
      }

      // if (salesOrder.customerId !== dispatch.customerId) {
      //   throw new BadRequestException('This SO Number belongs to a different customer than the one on the dispatch record.');
      // }

      const createdLink = await tx.dispatch_SO.create({
        data: { dispatchId, saleOrderNumber },
      });

      await tx.salesOrder.update({
        where: { saleOrderNumber },
        data: { status: 'Dispatched' },
      });

      return createdLink;
    });
  }

  async findAll() {
    const dispatches = await this.prisma.dispatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        transporter: { select: { name: true } },
        _count: {
          select: { dispatchSOs: true },
        },
      },
    });

    return dispatches.map((d) => ({
      ...d,
      soCount: d._count.dispatchSOs,
    }));
  }

  async update(id: number, dto: UpdateDispatchDto) {
    const { customerId, transporterId, vehicleNumber } = dto;
    return this.prisma.dispatch.update({
      where: { id },
      data: {
        customerId: customerId ? Number(customerId) : undefined,
        transporterId: transporterId ? Number(transporterId) : undefined,
        vehicleNumber,
      },
    });
  }

  async findDispatchSOs(dispatchId: number) {
    return this.prisma.dispatch_SO.findMany({
      where: { dispatchId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addDispatchSO(dispatchId: number, saleOrderNumber: string) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { customerId: true },
    });

    if (!dispatch) {
      throw new NotFoundException('Dispatch record not found.');
    }

    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { saleOrderNumber },
      select: { customerId: true },
    });

    if (!salesOrder) {
      throw new NotFoundException('Invalid SO Number');
    }

    // if (salesOrder.customerId !== dispatch.customerId) {
    //   throw new BadRequestException(
    //     'This SO Number belongs to a different customer.',
    //   );
    // }

    // Wrap the operations in a transaction
    return this.prisma.$transaction(async (tx) => {
      try {
        const newDispatchSO = await tx.dispatch_SO.create({
          data: {
            dispatchId,
            saleOrderNumber,
          },
        });

        // Add this block to update the SalesOrder status
        await tx.salesOrder.update({
          where: { saleOrderNumber },
          data: { status: 'Dispatched' },
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

  async removeDispatchSO(soId: number) {
    await this.prisma.dispatch_SO.delete({ where: { id: soId } });
    return { message: 'SO Number removed' };
  }

  async generatePdf(dispatchId: number): Promise<Buffer> {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        customer: true,
        dispatchSOs: {
          select: {
            saleOrderNumber: true,
          },
        },
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Dispatch not found');
    }

    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.fontSize(20).text('Dispatch Note', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Customer Name: ${dispatch.customer.name}`);
    doc.text(`Address: ${dispatch.customer.address}`);
    doc.moveDown();

    const tableTop = doc.y;
    const tableHeaders = ['S.No', 'Sale Order Number'];

    doc.font('Helvetica-Bold');
    tableHeaders.forEach((header, i) => {
      doc.text(header, 50 + i * 250, tableTop);
    });
    doc.font('Helvetica');

    dispatch.dispatchSOs.forEach((so, index) => {
      const y = tableTop + 25 + index * 25;
      doc.text(String(index + 1), 50, y);
      doc.text(so.saleOrderNumber, 300, y);
    });

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
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
      `${dispatch.id}_${Date.now()}`,
    );
    await this.sftpService.ensureDir(remoteDir);

    for (const file of files) {
      const remotePath = path.posix.join(remoteDir, file.filename);
      await this.sftpService.put(file.path, remotePath);
      newAttachments.push({
        fileName: file.originalname,
        path: remotePath,
        mimeType: file.mimetype,
        size: file.size,
      });
      fs.unlinkSync(file.path);
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
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });
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
