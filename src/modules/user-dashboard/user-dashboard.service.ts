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
import { EfficiencyService } from '../efficiency/efficiency.service';

function getDayBoundariesIST(date: Date) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS);
  const endOfDay = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - IST_OFFSET_MS);

  return { startOfDay, endOfDay };
}

@Injectable()
export class UserDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sftpService: SftpService,
    private readonly efficiencyService: EfficiencyService,
  ) {}

  async findAssignedOrders(userId: number) {
    const assignedOrders = await this.prisma.salesOrder.findMany({
      where: {
        OR: this.getAssignedVisibilityFilter(userId),
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
        _count: {
          select: {
            soChatNotifications: { where: { userId } },
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

    return incompleteOrders.map(({ materialData, _count, ...order }) => ({
      ...order,
      notificationCount: _count ? _count.soChatNotifications : 0,
    }));
  }

  async getAssignedOrdersSummary(userId: number) {
    const assignedOrders = await this.prisma.salesOrder.findMany({
      where: {
        OR: this.getAssignedVisibilityFilter(userId),
        materialData: {
          some: {},
        },
      },
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        priority: true,
        status: true,
        skipIssueStage: true,
        skipPackingStage: true,
        customer: { select: { name: true } },
        materialData: {
          select: {
            Required_Qty: true,
            A_D_F: true,
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
        id: order.id,
        saleOrderNumber: order.saleOrderNumber,
        outboundDelivery: order.outboundDelivery,
        priority: order.priority,
        status: order.status,
        skipIssueStage: order.skipIssueStage,
        skipPackingStage: order.skipPackingStage,
        totalMaterials,
        totalItems,
        customerName: order.customer?.name || null,
        adf: order.materialData[0]?.A_D_F || null,
      };
    });
  }

  async findOrderById(orderId: number, userId: number, userRole: string) {
    const whereClause: Prisma.SalesOrderWhereInput = { id: orderId };

    if (userRole !== 'ADMIN') {
      whereClause.OR = this.getAssignedVisibilityFilter(userId);
    }

    const order = await this.prisma.salesOrder.findFirst({
      where: whereClause,
      include: {
        customer: true,
        salesZone: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    return order;
  }

  async downloadOrderDetails(
    orderId: number,
    userId: number,
    userRole: string,
  ) {
    const order = await this.findOrderById(orderId, userId, userRole);

    return this.getMaterialDetails(
      order.saleOrderNumber,
      order.outboundDelivery,
      order.skipIssueStage ?? false,
      order.skipPackingStage ?? false,
      {
        salesZone: order.salesZone?.name ?? null,
        labelRemarks: order.labelRemarks ?? null,
        customerName: order.customer?.name ?? order.customerNameText ?? null,
      },
    );
  }

  async downloadOrderDetailsBySoNumber(
    saleOrderNumber: string,
    userId: number,
    userRole: string,
  ) {
    const order = await this.findUniqueAccessibleOrderBySoNumber(
      saleOrderNumber,
      userId,
      userRole,
    );

    return this.getMaterialDetails(
      order.saleOrderNumber,
      order.outboundDelivery,
      order.skipIssueStage ?? false,
      order.skipPackingStage ?? false,
      {
        salesZone: order.salesZone?.name ?? null,
        labelRemarks: order.labelRemarks ?? null,
        customerName: order.customer?.name ?? order.customerNameText ?? null,
      },
    );
  }

  private async getMaterialDetails(
    saleOrderNumber: string,
    outboundDelivery?: string | null,
    skipIssueStage?: boolean,
    skipPackingStage?: boolean,
    meta?: {
      salesZone?: string | null;
      labelRemarks?: string | null;
      customerName?: string | null;
    },
  ) {
    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber,
        ...(outboundDelivery ? { FG_OBD: outboundDelivery } : {}),
      },
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
        Accept_Bulk_Data: true,
        Classification: true,
        Group: true,
        Mapping_Barcode: true,
        Remarks_Required: true,
        Remarks: true,
        CNC_Serial_No: true,
      },
    });

    return materials.map((material) => ({
      ...material,
      ID: material.ID.toString(),
      salesZone: meta?.salesZone ?? null,
      labelRemarks: meta?.labelRemarks ?? null,
      customerName: meta?.customerName ?? null,
      skipIssueStage: !!skipIssueStage,
      skipPackingStage: !!skipPackingStage,
    }));
  }

  async syncOrderById(
    orderId: number,
    user: { userId: number; role: string; name: string },
    data: UpdateMaterialDataDto,
    attachments: Express.Multer.File[],
  ) {
    const order = await this.findOrderById(orderId, user.userId, user.role);

    return this.processCombinedUpload(
      order.saleOrderNumber,
      order.outboundDelivery,
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
    const order = await this.findUniqueAccessibleOrderBySoNumber(
      saleOrderNumber,
      user.userId,
      user.role,
    );

    return this.processCombinedUpload(
      order.saleOrderNumber,
      order.outboundDelivery,
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
    const result = await this.processDataUpdate(
      order.saleOrderNumber,
      order.outboundDelivery,
      data,
      user.name,
    );
    if (result.completion?.orderId) {
      if (result.completion.issueCompleted)
        await this.efficiencyService.recordStageCompletion(
          result.completion.orderId,
          'Issue',
        );
      if (result.completion.packingCompleted)
        await this.efficiencyService.recordStageCompletion(
          result.completion.orderId,
          'Packing',
        );
    }
    return result;
  }

  async updateDataBySoNumber(
    saleOrderNumber: string,
    user: { userId: number; role: string; name: string },
    data: UpdateMaterialDataDto,
  ) {
    const order = await this.findUniqueAccessibleOrderBySoNumber(
      saleOrderNumber,
      user.userId,
      user.role,
    );
    const result = await this.processDataUpdate(
      order.saleOrderNumber,
      order.outboundDelivery,
      data,
      user.name,
    );
    if (result.completion?.orderId) {
      if (result.completion.issueCompleted)
        await this.efficiencyService.recordStageCompletion(
          result.completion.orderId,
          'Issue',
        );
      if (result.completion.packingCompleted)
        await this.efficiencyService.recordStageCompletion(
          result.completion.orderId,
          'Packing',
        );
    }
    return result;
  }

  async uploadAttachmentsById(
    orderId: number,
    user: { userId: number; role: string },
    attachments: Express.Multer.File[],
  ) {
    const order = await this.findOrderById(orderId, user.userId, user.role);

    return this.processAttachmentsUpload(
      order.saleOrderNumber,
      order.outboundDelivery,
      attachments,
    );
  }

  async uploadAttachmentsBySoNumber(
    saleOrderNumber: string,
    user: { userId: number; role: string },
    attachments: Express.Multer.File[],
  ) {
    const order = await this.findUniqueAccessibleOrderBySoNumber(
      saleOrderNumber,
      user.userId,
      user.role,
    );

    return this.processAttachmentsUpload(
      order.saleOrderNumber,
      order.outboundDelivery,
      attachments,
    );
  }

  private async processCombinedUpload(
    saleOrderNumber: string,
    outboundDelivery: string | null | undefined,
    data: UpdateMaterialDataDto,
    attachments: Express.Multer.File[],
    userName: string,
  ) {
    try {
      let completion:
        | {
            issueCompleted: boolean;
            packingCompleted: boolean;
            orderId: number | null;
          }
        | undefined;

      await this.prisma.$transaction(async (tx) => {
        const result = await this.processDataUpdate(
          saleOrderNumber,
          outboundDelivery,
          data,
          userName,
          tx,
        );
        completion = result.completion;
        await this.processAttachmentsUpload(
          saleOrderNumber,
          outboundDelivery,
          attachments,
          tx,
        );
      });

      if (completion?.orderId) {
        if (completion.issueCompleted)
          await this.efficiencyService.recordStageCompletion(
            completion.orderId,
            'Issue',
          );
        if (completion.packingCompleted)
          await this.efficiencyService.recordStageCompletion(
            completion.orderId,
            'Packing',
          );
      }

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
    outboundDelivery: string | null | undefined,
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
      let issueChanged = false;
      let packingChanged = false;

      if (material.ID) {
        const existing = await prismaClient.eRP_Material_Data.findUnique({
          where: { ID: BigInt(material.ID) },
        });

        if (existing && existing.Issue_stage !== material.Issue_stage) {
          issueChanged = true;
        }

        if (existing && existing.Packing_stage !== material.Packing_stage) {
          packingChanged = true;
        }
      } else {
        const existingList = await prismaClient.eRP_Material_Data.findMany({
          where: {
            saleOrderNumber,
            Material_Code: material.Material_Code,
            ...(outboundDelivery ? { FG_OBD: outboundDelivery } : {}),
          },
        });

        if (existingList.some((e) => e.Issue_stage !== material.Issue_stage)) {
          issueChanged = true;
        }

        if (
          existingList.some((e) => e.Packing_stage !== material.Packing_stage)
        ) {
          packingChanged = true;
        }
      }

      const updatedDate = material.UpdatedDate
        ? new Date(material.UpdatedDate)
        : new Date();

      const updateData: Prisma.ERP_Material_DataUpdateInput = {
        Issue_stage: material.Issue_stage,
        Packing_stage: material.Packing_stage,
        Remarks: material.Remarks,
        Group: material.Group,
        Mapping_Barcode: material.Mapping_Barcode,
        UpdatedBy: userName,
        UpdatedDate: updatedDate,
      };

      if (issueChanged) {
        updateData.IssueUpdatedBy = userName;
        updateData.IssueUpdatedDate = updatedDate;
      }

      if (packingChanged) {
        updateData.PackingUpdatedBy = userName;
        updateData.PackingUpdatedDate = updatedDate;
      }

      if (material.ID) {
        await prismaClient.eRP_Material_Data.update({
          where: { ID: BigInt(material.ID) },
          data: updateData,
        });
      } else {
        await prismaClient.eRP_Material_Data.updateMany({
          where: {
            saleOrderNumber,
            Material_Code: material.Material_Code,
            ...(outboundDelivery ? { FG_OBD: outboundDelivery } : {}),
          },
          data: updateData,
        });
      }
    }

    const completion = await this._checkAndUpdateOrderStatus(
      saleOrderNumber,
      outboundDelivery,
      prismaClient,
      userName,
    );
    return { message: 'Data updated successfully.', completion };
  }

  private async processAttachmentsUpload(
    saleOrderNumber: string,
    outboundDelivery: string | null | undefined,
    attachments: Express.Multer.File[],
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx || this.prisma;

    if (!attachments || attachments.length === 0) {
      return;
    }

    const remoteDir = path.posix.join(
      process.env.SFTP_BASE_DIR_ORDER || '',
      saleOrderNumber,
      outboundDelivery || 'NO_OBD',
    );

    await this.sftpService.ensureDir(remoteDir);

    for (const file of attachments) {
      const remotePath = path.posix.join(remoteDir, file.originalname);
      await this.sftpService.put(file.path, remotePath);

      await prismaClient.eRP_Material_File.create({
        data: {
          saleOrderNumber,
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

  private async authorizeResolvedOrderAccess(
    order: {
      issueAssignedUserId: number | null;
      packingAssignedUserId: number | null;
      assignedUserId: number | null;
      status: string | null;
      skipIssueStage: boolean | null;
    },
    userId: number,
    userRole: string,
  ) {
    if (userRole !== 'USER') {
      return;
    }

    const isIssueUser = order.issueAssignedUserId === userId;
    const isPackingUser = order.packingAssignedUserId === userId;
    const isAssignedUser = order.assignedUserId === userId;

    if (!isIssueUser && !isPackingUser && !isAssignedUser) {
      throw new ForbiddenException(
        'You are not authorized to modify this order.',
      );
    }

    if (!isIssueUser && isPackingUser) {
      const isIssueCompleted =
        ['W105', 'F105'].includes(order.status ?? '') || order.skipIssueStage;

      if (!isIssueCompleted) {
        throw new ForbiddenException(
          'Cannot access order: Issue stage is not completed yet.',
        );
      }
    }
  }

  private async findUniqueAccessibleOrderBySoNumber(
    saleOrderNumber: string,
    userId: number,
    userRole: string,
  ) {
    const orders = await this.prisma.salesOrder.findMany({
      where: { saleOrderNumber },
      include: {
        customer: true,
        salesZone: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (orders.length === 0) {
      throw new NotFoundException('Sales Order not found.');
    }

    if (orders.length > 1) {
      throw new BadRequestException(
        'Multiple orders found for this SO Number. Please use order ID based APIs.',
      );
    }

    const order = orders[0];
    await this.authorizeResolvedOrderAccess(order, userId, userRole);

    return order;
  }

  private async _checkAndUpdateOrderStatus(
    saleOrderNumber: string,
    outboundDelivery: string | null | undefined,
    prismaClient: Prisma.TransactionClient | PrismaService,
    userName: string,
  ) {
    const order = await prismaClient.salesOrder.findFirst({
      where: {
        saleOrderNumber,
        ...(outboundDelivery ? { outboundDelivery } : {}),
      },
      select: { id: true, status: true, packingAssignedUserId: true },
    });

    if (!order) {
      return { issueCompleted: false, packingCompleted: false, orderId: null };
    }

    const allMaterials = await prismaClient.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber,
        ...(outboundDelivery ? { FG_OBD: outboundDelivery } : {}),
      },
      select: { Issue_stage: true, Packing_stage: true, Required_Qty: true },
    });

    if (allMaterials.length === 0) {
      return {
        issueCompleted: false,
        packingCompleted: false,
        orderId: order.id,
      };
    }

    let issueCompleted = false;
    let packingCompleted = false;

    const issueStageCompleted = allMaterials.every(
      (m) => m.Required_Qty > 0 && m.Issue_stage >= m.Required_Qty,
    );

    if (
      issueStageCompleted &&
      order.status !== 'W105' &&
      order.status !== 'F105'
    ) {
      await prismaClient.salesOrder.update({
        where: { id: order.id },
        data: {
          status: 'W105',
        },
      });

      // NEW CODE
      await prismaClient.sO_Status_Stepper.upsert({
        where: {
          salesOrderId_status: { salesOrderId: order.id, status: 'Issued' },
        },
        update: { createdDateTime: new Date(), updatedBy: userName },
        create: {
          salesOrderNumber: saleOrderNumber,
          salesOrderId: order.id,
          status: 'Issued',
          createdDateTime: new Date(),
          updatedBy: userName,
        },
      });

      if (order.packingAssignedUserId) {
        await prismaClient.sO_Status_Stepper.upsert({
          where: {
            salesOrderId_status: {
              salesOrderId: order.id,
              status: 'Under Packing',
            },
          },
          update: { createdDateTime: new Date(), updatedBy: userName },
          create: {
            salesOrderNumber: saleOrderNumber,
            salesOrderId: order.id,
            status: 'Under Packing',
            createdDateTime: new Date(),
            updatedBy: userName,
          },
        });
      }
      issueCompleted = true;
    }

    const packingStageCompleted = allMaterials.every(
      (m) => m.Required_Qty > 0 && m.Packing_stage >= m.Required_Qty,
    );

    if (packingStageCompleted) {
      await prismaClient.salesOrder.update({
        where: { id: order.id },
        data: {
          status: 'F105',
        },
      });

      await prismaClient.sO_Status_Stepper.upsert({
        where: {
          salesOrderId_status: { salesOrderId: order.id, status: 'Packed' },
        },
        update: { createdDateTime: new Date(), updatedBy: userName },
        create: {
          salesOrderNumber: saleOrderNumber,
          salesOrderId: order.id,
          status: 'Packed',
          createdDateTime: new Date(),
          updatedBy: userName,
        },
      });
      packingCompleted = true;
    }
    return { issueCompleted, packingCompleted, orderId: order.id };
  }

  async getDashboardStats(userId: number, dateStr?: string) {
    let completedOrdersCount = 0;

    const assignedFilter: Prisma.SalesOrderWhereInput = {
      OR: this.getAssignedVisibilityFilter(userId),
      materialData: {
        some: {},
      },
    };

    if (dateStr) {
      const targetDate = new Date(dateStr);
      const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);

      assignedFilter.updatedAt = { gte: startOfDay, lt: endOfDay };

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      if (user?.name) {
        const completedOrders = await this.prisma.sO_Status_Stepper.findMany({
          where: {
            updatedBy: user.name,
            status: { in: ['Issued', 'Packed'] },
            createdDateTime: { gte: startOfDay, lt: endOfDay },
          },
          distinct: ['salesOrderNumber'],
          select: { salesOrderNumber: true },
        });

        completedOrdersCount = completedOrders.length;
      }
    }

    const assignedOrders = await this.prisma.salesOrder.findMany({
      where: assignedFilter,
      select: {
        materialData: {
          select: {
            Required_Qty: true,
            Issue_stage: true,
            Packing_stage: true,
          },
        },
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

    return {
      assignedOrdersCount: incompleteOrders.length,
      completedOrdersCount: dateStr ? completedOrdersCount : undefined,
    };
  }

  async getRecentActivity(userId: number) {
    const assignments = await this.prisma.salesOrder.findMany({
      where: { assignedUserId: userId },
      select: { saleOrderNumber: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    const notifications = await this.prisma.soChatNotification.findMany({
      where: { userId },
      include: {
        message: {
          select: {
            fromUser: { select: { name: true } },
          },
        },
        salesOrder: { select: { saleOrderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const assignmentActivity = assignments.map((order) => ({
      id: `assign-${order.saleOrderNumber}`,
      text: `Order ${order.saleOrderNumber} assigned to you`,
      timestamp: order.updatedAt,
      type: 'ASSIGNMENT',
    }));

    const notificationActivity = notifications.map((notif) => ({
      id: `msg-${notif.id}`,
      text: `Message from ${notif.message.fromUser.name} for ${notif.salesOrder.saleOrderNumber}`,
      timestamp: notif.createdAt,
      type: 'MESSAGE',
    }));

    const combinedActivity = [...assignmentActivity, ...notificationActivity]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return combinedActivity;
  }

  private getAssignedVisibilityFilter(
    userId: number,
  ): Prisma.SalesOrderWhereInput['OR'] {
    return [
      {
        AND: [
          { issueAssignedUserId: userId },
          {
            OR: [{ status: 'R105' }, { status: null }, { status: '' }],
          },
        ],
      },
      {
        AND: [{ packingAssignedUserId: userId }, { status: 'W105' }],
      },
      {
        AND: [
          { assignedUserId: userId },
          {
            OR: [
              { status: 'R105' },
              { status: 'W105' },
              { status: null },
              { status: '' },
            ],
          },
        ],
      },
    ];
  }
}
