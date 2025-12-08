import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateMaterialDataDto } from './dto/update-material-data.dto';
import { SftpService } from '../sftp/sftp.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UserDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sftpService: SftpService,
  ) {}

  async findAssignedOrders(userId: number) {
    const assignedOrders = await this.prisma.salesOrder.findMany({
      where: {
        assignedUserId: userId,
        materialData: {
          some: {},
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        packConfig: {
          select: {
            configName: true,
          },
        },
        materialData: {
          select: {
            Required_Qty: true,
            Issue_stage: true,
            Packing_stage: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const incompleteOrders = assignedOrders.filter((order) => {
      if (order.materialData.length === 0) {
        return false;
      }
      const isComplete = order.materialData.every(
        (material) =>
          material.Required_Qty > 0 &&
          material.Required_Qty === material.Issue_stage &&
          material.Issue_stage === material.Packing_stage,
      );
      return !isComplete;
    });
    return incompleteOrders.map(({ materialData, ...order }) => order);
  }

  async getAssignedOrdersSummary(userId: number) {
    const assignedOrders = await this.prisma.salesOrder.findMany({
      where: {
        assignedUserId: userId,
        materialData: {
          some: {},
        },
      },
      select: {
        saleOrderNumber: true,
        priority: true,
        status: true,
        materialData: {
          select: {
            Required_Qty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assignedOrders.map((order) => {
      const totalMaterials = order.materialData.length;
      const totalItems = order.materialData.reduce(
        (sum, material) => sum + material.Required_Qty,
        0,
      );
      return {
        saleOrderNumber: order.saleOrderNumber,
        priority: order.priority,
        status: order.status,
        totalMaterials,
        totalItems,
      };
    });
  }

  async findOrderById(orderId: number, userId: number, userRole: string) {
    const whereClause: Prisma.SalesOrderWhereInput = { id: orderId };

    if (userRole !== 'ADMIN') {
      whereClause.assignedUserId = userId;
    }

    const order = await this.prisma.salesOrder.findFirst({
      where: whereClause,
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    return order;
  }

  async downloadOrderDetails(orderId: number, userId: number, userRole: string) {
    const order = await this.findOrderById(orderId, userId, userRole);
    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }
    return this.getMaterialDetails(order.saleOrderNumber);
  }

  async downloadOrderDetailsBySoNumber(
    saleOrderNumber: string,
    userId: number,
    userRole: string,
  ) {
    await this.authorizeOrderAccess(saleOrderNumber, userId, userRole);
    return this.getMaterialDetails(saleOrderNumber);
  }

  private async getMaterialDetails(saleOrderNumber: string) {
    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber },
      select: {
        ID: true,
        Material_Code: true,
        Material_Description: true,
        Batch_No: true,
        SO_Donor_Batch: true,
        Cert_No: true,
        Bin_No: true,
        A_D_F: true,
        Required_Qty: true,
        Issue_stage: true,
        Packing_stage: true,
        UpdatedDate: true,
      },
    });
    return materials.map((material) => ({
      ...material,
      ID: material.ID.toString(),
    }));
  }

  async syncOrderById(
    orderId: number,
    user: { userId: number; role: string; name: string },
    data: UpdateMaterialDataDto,
    attachments: Express.Multer.File[],
  ) {
    const order = await this.findOrderById(orderId, user.userId, user.role);
    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }
    return this.processCombinedUpload(
      order.saleOrderNumber,
      data,
      attachments,
      user.name,
    );
  }

  async syncOrderBySoNumber(
    saleOrderNumber: string,
    user: { userId: number; role: string; name: string },
    data: UpdateMaterialDataDto,
    attachments: Express.Multer.File[],
  ) {
    await this.authorizeOrderAccess(saleOrderNumber, user.userId, user.role);
    return this.processCombinedUpload(
      saleOrderNumber,
      data,
      attachments,
      user.name,
    );
  }

  async updateDataById(
    orderId: number,
    user: { userId: number; role: string; name: string },
    data: UpdateMaterialDataDto,
  ) {
    const order = await this.findOrderById(orderId, user.userId, user.role);
    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }
    return this.processDataUpdate(order.saleOrderNumber, data, user.name);
  }

  async updateDataBySoNumber(
    saleOrderNumber: string,
    user: { userId: number; role: string; name: string },
    data: UpdateMaterialDataDto,
  ) {
    await this.authorizeOrderAccess(saleOrderNumber, user.userId, user.role);
    return this.processDataUpdate(saleOrderNumber, data, user.name);
  }

  async uploadAttachmentsById(
    orderId: number,
    user: { userId: number; role: string },
    attachments: Express.Multer.File[],
  ) {
    const order = await this.findOrderById(orderId, user.userId, user.role);
    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }
    return this.processAttachmentsUpload(order.saleOrderNumber, attachments);
  }

  async uploadAttachmentsBySoNumber(
    saleOrderNumber: string,
    user: { userId: number; role: string },
    attachments: Express.Multer.File[],
  ) {
    await this.authorizeOrderAccess(saleOrderNumber, user.userId, user.role);
    return this.processAttachmentsUpload(saleOrderNumber, attachments);
  }

  private async processCombinedUpload(
    saleOrderNumber: string,
    data: UpdateMaterialDataDto,
    attachments: Express.Multer.File[],
    userName: string,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.processDataUpdate(saleOrderNumber, data, userName, tx);
        await this.processAttachmentsUpload(saleOrderNumber, attachments, tx);
      });
      return { message: 'Data and attachments synchronized successfully.' };
    } catch (error) {
      console.error('ERROR during combined sync:', error);
      throw new BadRequestException(
        'Failed to synchronize data and attachments.',
      );
    }
  }

  private async processDataUpdate(
    saleOrderNumber: string,
    data: UpdateMaterialDataDto,
    userName: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx || this.prisma;
    const { materials } = data;
    if (!materials || materials.length === 0) {
      throw new BadRequestException('No materials data provided.');
    }

    for (const material of materials) {
      await prismaClient.eRP_Material_Data.updateMany({
        where: {
          saleOrderNumber: saleOrderNumber,
          Material_Code: material.Material_Code,
        },
        data: {
          Issue_stage: material.Issue_stage,
          Packing_stage: material.Packing_stage,
          UpdatedBy: userName,
          // Use the provided timestamp if it exists, otherwise use the sync time
          UpdatedDate: material.UpdatedDate
            ? new Date(material.UpdatedDate)
            : new Date(),
        },
      });
    }

    await this._checkAndUpdateOrderStatus(saleOrderNumber, prismaClient, userName);

    return { message: 'Data updated successfully.' };
  }

  private async processAttachmentsUpload(
    saleOrderNumber: string,
    attachments: Express.Multer.File[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx || this.prisma;
    if (!attachments || attachments.length === 0) {
      // Allow data-only updates
      return;
    }

    const remoteDir = path.posix.join(
      process.env.SFTP_BASE_DIR_ORDER || '',
      saleOrderNumber,
    );
    await this.sftpService.ensureDir(remoteDir);

    for (const file of attachments) {
      const remotePath = path.posix.join(remoteDir, file.originalname);
      await this.sftpService.put(file.path, remotePath);

      await prismaClient.eRP_Material_File.create({
        data: {
          saleOrderNumber: saleOrderNumber,
          fileName: file.originalname,
          sftpPath: remotePath,
          sftpDir: remoteDir,
          fileSizeBytes: BigInt(file.size),
          mimeType: file.mimetype,
        },
      });
      fs.unlinkSync(file.path);
    }
    return { message: 'Attachments uploaded successfully.' };
  }

  private async authorizeOrderAccess(
    saleOrderNumber: string,
    userId: number,
    userRole: string,
  ) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { saleOrderNumber },
    });
    if (!order) {
      throw new NotFoundException('Sales Order not found.');
    }
    if (userRole === 'USER' && order.assignedUserId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to modify this order.',
      );
    }
  }

  private async _checkAndUpdateOrderStatus(
    saleOrderNumber: string,
    prismaClient: Prisma.TransactionClient | PrismaService,
    userName: string,
  ) {
    const order = await prismaClient.salesOrder.findUnique({
      where: { saleOrderNumber },
      select: { id: true, status: true },
    });
    if (!order) return;

    const allMaterials = await prismaClient.eRP_Material_Data.findMany({
      where: { saleOrderNumber: saleOrderNumber },
      select: { Issue_stage: true, Packing_stage: true, Required_Qty: true },
    });

    if (allMaterials.length === 0) return;

    const issueStageCompleted = allMaterials.every(
      (m) => m.Required_Qty > 0 && m.Issue_stage >= m.Required_Qty,
    );

    if (issueStageCompleted && order.status !== 'W105' && order.status !== 'F105') {
      await prismaClient.salesOrder.update({
        where: { id: order.id },
        data: { status: 'W105', assignedUserId: null },
      });

      await prismaClient.sO_Status_Stepper.updateMany({
        where: {
          salesOrderNumber: saleOrderNumber,
          status: 'Issued',
        },
        data: {
          createdDateTime: new Date(),
          updatedBy: userName,
        },
      });
    }

    const packingStageCompleted = allMaterials.every(
      (m) => m.Required_Qty > 0 && m.Packing_stage >= m.Required_Qty,
    );

    if (packingStageCompleted) {
      await prismaClient.salesOrder.update({
        where: { id: order.id },
        data: { status: 'F105', assignedUserId: null },
      });

      await prismaClient.sO_Status_Stepper.updateMany({
        where: {
          salesOrderNumber: saleOrderNumber,
          status: 'Packed',
        },
        data: {
          createdDateTime: new Date(),
          updatedBy: userName,
        },
      });
    }
  }
}