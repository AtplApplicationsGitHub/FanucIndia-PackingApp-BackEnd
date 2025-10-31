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

export interface AttachmentData {
  fileName: string;
  path: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  private async getUserName(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.name || 'System';
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
      customerId: customerIdString,
      customerName,
      address,
      transporterId: transporterIdString,
      vehicleNumber,
      saleOrderNumbers,
    } = dto;

    return this.prisma.$transaction(async (tx) => {
      let finalCustomerId: number | null = null;
      let finalCustomerName: string | null = null;

      if (customerIdString) {
        // User selected an existing customer from dropdown
        const parsedCustomerId = parseInt(customerIdString, 10);
        if (isNaN(parsedCustomerId)) {
          throw new BadRequestException('Invalid customerId provided.');
        }
        const customerExists = await tx.customer.findUnique({
          where: { id: parsedCustomerId },
        });
        if (!customerExists) {
          throw new BadRequestException(
            `Customer with ID ${parsedCustomerId} not found.`,
          );
        }
        finalCustomerId = parsedCustomerId;
      } else if (customerName) {
        // User typed a new customer name
        this.logger.log(
          `Saving dispatch with direct customer name: "${customerName}".`,
        );
        finalCustomerName = customerName;
      } else {
        throw new BadRequestException(
          'Either customerId or customerName must be provided.',
        );
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      const userName = user?.name || 'System';

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
          customerId: finalCustomerId,
          customerName: finalCustomerName,
          address: address,
          transporterId:
            finalTransporterId === null ? undefined : finalTransporterId,
          vehicleNumber,
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
          await this.sftpService.put(file.path, remotePath);
          uploadedAttachments.push({
            fileName: file.originalname,
            path: remotePath,
            mimeType: file.mimetype,
            size: file.size,
          });
          fs.unlinkSync(file.path);
        }

        await tx.dispatch.update({
          where: { id: newDispatch.id },
          data: {
            attachments: uploadedAttachments as unknown as Prisma.JsonArray,
          },
        });
      }

      if (saleOrderNumbers && saleOrderNumbers.length > 0) {
        for (const so of saleOrderNumbers) {
          const salesOrder = await tx.salesOrder.findUnique({
            where: { saleOrderNumber: so },
          });
          if (!salesOrder)
            throw new BadRequestException(`Sale Order ${so} not found.`);
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
            fgLocation: null,
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
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { attachments: true },
    });

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
      customerId,
      customerName,
      address,
      transporterId,
      transporterName,
      vehicleNumber,
    } = dto;

    return this.prisma.$transaction(async (tx) => {
      let finalCustomerId: number | null = null;
      let finalCustomerName: string | null = null;

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
        finalCustomerName = customerName;
      } else {
        throw new BadRequestException(
          'Either customerId or customerName must be provided.',
        );
      }

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
      const userName = user?.name || 'System';

      const newDispatch = await tx.dispatch.create({
        data: {
          customerId: finalCustomerId,
          customerName: finalCustomerName,
          address,
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

  async addMobileDispatchSO(
    dispatchId: number,
    saleOrderNumber: string,
    userId: number,
  ) {
    const userName = await this.getUserName(userId);
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
        data: { dispatchId, saleOrderNumber: salesOrder.saleOrderNumber },
      });

      await tx.dispatch.update({
        where: { id: dispatchId },
        data: {
          UpdatedDate: new Date(),
        },
      });

      await tx.salesOrder.update({
        where: { saleOrderNumber: salesOrder.saleOrderNumber },
        data: {
          assignedUserId: null,
          status: 'Dispatched',
          fgLocation: null,
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
      });
      return createdLink;
    });
  }

  async findAll() {
    const dispatches = await this.prisma.dispatch.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerId: true,
        customerName: true,
        address: true,
        transporterId: true,
        vehicleNumber: true,
        attachments: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        UpdatedBy: true,
        UpdatedDate: true,
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

  async update(id: number, dto: UpdateDispatchDto, userId: number) {
    const { customerId, customerName, address, transporterId, vehicleNumber } = dto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const existingDispatch = await this.prisma.dispatch.findUnique({ where: { id } });
    if (!existingDispatch) {
      throw new NotFoundException(`Dispatch with ID ${id} not found.`);
    }

    let finalCustomerId: number | null = null;
    let finalCustomerName: string | null = null;

    // [CHANGE] Add update logic
    if (customerId) {
      finalCustomerId = Number(customerId);
    } else if (customerName) {
      finalCustomerName = customerName;
    } else {
      // If user clears the field, we respect that (though UI shouldn't allow it)
      finalCustomerId = null;
      finalCustomerName = null;
    }
    // [END CHANGE]

    return this.prisma.dispatch.update({
      where: { id },
      data: {
        // [CHANGE] Update data
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        address: address, // Always update address
        // [END CHANGE]
        transporterId: transporterId ? Number(transporterId) : undefined,
        vehicleNumber,
        UpdatedBy: user?.name || 'System',
        UpdatedDate: new Date(),
      },
    });
  }

  async updateMobileDispatch(dispatchId: number, dto: UpdateMobileDispatchDto, userId: number) {
    const {
      customerId,
      customerName,
      address,
      transporterId,
      transporterName,
      vehicleNumber,
    } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify Dispatch Exists
      const dispatch = await tx.dispatch.findUnique({ where: { id: dispatchId } });
      if (!dispatch) {
        throw new NotFoundException(`Dispatch with ID ${dispatchId} not found.`);
      }

      // 2. Determine Customer ID (Find by ID, Find by Name, or Create)
      let finalCustomerId: number | null = null;
      let finalCustomerName: string | null = null;

      if (customerId) {
        finalCustomerId = Number(customerId);
        const customerExists = await tx.customer.findUnique({ where: { id: finalCustomerId } });
        if (!customerExists) {
          throw new BadRequestException(`Customer with ID ${customerId} not found.`);
        }
      } else if (customerName) {
        // This is the key change: just store the name, don't create/update customer
        finalCustomerName = customerName;
      } else {
        throw new BadRequestException('Either customerId or customerName must be provided for update.');
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

      const userName = await this.getUserName(userId);

      // 5. Update Dispatch Record
      const updatedDispatch = await tx.dispatch.update({
        where: { id: dispatchId },
        data: {
          customerId: finalCustomerId,
          customerName: finalCustomerName,
          address: address, 
          transporterId: finalTransporterId, 
          transporterName: finalTransporterName,
          vehicleNumber: vehicleNumber,
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
        include: { 
          customer: true,
          transporter: true,
        }
      });

      return updatedDispatch;
    });
  }

  async findDispatchSOs(dispatchId: number) {
    return this.prisma.dispatch_SO.findMany({
      where: { dispatchId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addDispatchSO(
    dispatchId: number,
    saleOrderNumber: string,
    userId: number,
  ) {
    const dispatch = await this.prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { customerId: true },
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
      select: { customerId: true, saleOrderNumber: true },
    });

    if (!salesOrder) {
      throw new NotFoundException('Invalid SO Number');
    }

    const userName = await this.getUserName(userId);

    return this.prisma.$transaction(async (tx) => {
      try {
        const newDispatchSO = await tx.dispatch_SO.create({
          data: {
            dispatchId,
            saleOrderNumber: salesOrder.saleOrderNumber,
          },
        });

        await tx.dispatch.update({
          where: { id: dispatchId },
          data: {
            UpdatedDate: new Date(),
          },
        });

        await tx.salesOrder.update({
          where: { saleOrderNumber: salesOrder.saleOrderNumber },
          data: {
            assignedUserId: null,
            status: 'Dispatched',
            fgLocation: null,
            UpdatedBy: userName,
            UpdatedDate: new Date(),
          },
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

    const userName = await this.getUserName(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.dispatch_SO.delete({ where: { id: soId } });

      await tx.salesOrder.update({
        where: { saleOrderNumber: dispatchSoLink.saleOrderNumber },
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

    doc.fontSize(12).text(`Customer Name: ${dispatch.customerName || dispatch.customer?.name || 'N/A'}`);
    doc.text(`Address: ${dispatch.address}`);
    doc.moveDown();

    const tableTop = doc.y;
    const tableHeaders = ['S.No', 'Sale Order Number'];
    const col1X = 50; // X position for S.No
    const col2X = 150; // X position for Sale Order Number (matches data)

    doc.font('Helvetica-Bold');
    // Draw Headers using specific X positions
    doc.text(tableHeaders[0], col1X, tableTop); // "S.No" at 50
    doc.text(tableHeaders[1], col2X, tableTop); // "Sale Order Number" at 150
    doc.font('Helvetica');

    // Draw Rows (This part is already correct)
    dispatch.dispatchSOs.forEach((so, index) => {
      const y = tableTop + 25 + index * 25;
      doc.text(String(index + 1), col1X, y); // S.No data at 50
      doc.text(so.saleOrderNumber, col2X, y); // Sale Order Number data at 150
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
      String(dispatchId),
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
