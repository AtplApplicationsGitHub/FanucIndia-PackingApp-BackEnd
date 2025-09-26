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
        return true;
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

  async findOrderById(orderId: number, userId: number, userRole: string) {
    const whereClause: Prisma.SalesOrderWhereInput = { id: orderId };

    if (userRole !== 'ADMIN') {
      whereClause.assignedUserId = userId;
    }

    return this.prisma.salesOrder.findFirst({
      where: whereClause,
      include: {
        customer: true,
      },
    });
  }

  async getAssignedOrdersSummary(userId: number) {
    const assignedOrders = await this.prisma.salesOrder.findMany({
      where: {
        assignedUserId: userId,
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

  async downloadOrderDetails(
    orderId: number,
    userId: number,
    userRole: string,
  ) {
    const order = await this.findOrderById(orderId, userId, userRole);
    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    const materialDetails = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: order.saleOrderNumber,
      },
      select: {
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
      },
    });

    return materialDetails;
  }

  async downloadOrderDetailsBySoNumber(
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
        'You are not authorized to view this order.',
      );
    }

    const materialDetails = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: order.saleOrderNumber,
      },
      select: {
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
      },
    });

    return materialDetails;
  }

  async uploadOrderDetails(
    orderId: number,
    userId: number,
    userRole: string,
    data: UpdateMaterialDataDto,
    attachments: Express.Multer.File[] = [],
  ) {
    const order = await this.findOrderById(orderId, userId, userRole);
    if (!order) {
      throw new NotFoundException('Sales order not found or access denied.');
    }

    return this.processUpload(order.saleOrderNumber, data, attachments);
  }

  async uploadOrderDetailsBySoNumber(
    saleOrderNumber: string,
    userId: number,
    userRole: string,
    data: UpdateMaterialDataDto,
    attachments: Express.Multer.File[] = [],
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

    return this.processUpload(saleOrderNumber, data, attachments);
  }

  private async processUpload(
    saleOrderNumber: string,
    data: UpdateMaterialDataDto,
    attachments: Express.Multer.File[],
  ) {
    const { materials } = data;

    if (!materials || materials.length === 0) {
      throw new BadRequestException('No materials data provided.');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const material of materials) {
          await tx.eRP_Material_Data.updateMany({
            where: {
              saleOrderNumber: saleOrderNumber,
              Material_Code: material.Material_Code,
            },
            data: {
              Issue_stage: material.Issue_stage,
              Packing_stage: material.Packing_stage,
              UpdatedBy: 'MOBILE_SYNC',
              UpdatedDate: new Date(),
            },
          });
        }

        if (attachments.length > 0) {
          const remoteDir = path.posix.join(
            process.env.SFTP_BASE_DIR || '/fanuc/order-attachments',
            saleOrderNumber,
          );
          await this.sftpService.ensureDir(remoteDir);

          for (const file of attachments) {
            const remotePath = path.posix.join(remoteDir, file.filename);
            await this.sftpService.put(file.path, remotePath);

            await tx.eRP_Material_File.create({
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
        }
      });

      return {
        message: 'Data and attachments uploaded and synchronized successfully.',
      };
    } catch (error) {
      console.error('ERROR during upload process:', error);
      throw new BadRequestException(
        'Failed to update material data or upload attachments.',
      );
    }
  }
}
