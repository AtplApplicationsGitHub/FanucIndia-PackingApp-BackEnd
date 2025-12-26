import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

function convertBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigInts);
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = convertBigInts(obj[key]);
      }
    }
  }
  return obj;
}

async function verifyOrderAccess(
  prisma: PrismaService,
  orderId: number,
  userId: number,
  userRole: string,
): Promise<Prisma.SalesOrderWhereUniqueInput> {
  if (userRole === 'ADMIN') {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Sales Order not found');
    return { id: orderId };
  }

  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, assignedUserId: userId },
  });
  if (!order) {
    throw new ForbiddenException(
      'You do not have permission to access this order.',
    );
  }
  return { id: orderId };
}

@Injectable()
export class ErpMaterialDataService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserName(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.name || 'System'; 
  }

  async getMaterialsByOrderId(
    orderId: number,
    userId: number,
    userRole: string,
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);

    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true },
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber: salesOrder.saleOrderNumber },
      orderBy: { ID: 'asc' },
    });

    return convertBigInts(materials);
  }

  async incrementIssueStage(
    orderId: number,
    materialCode: string,
    userId: number,
    userRole: string,
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true },
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        OR: [
          { Material_Code: { equals: materialCode, mode: 'insensitive' } },
          { Mapping_Barcode: { equals: materialCode, mode: 'insensitive' } },
        ]
      },
      orderBy: { ID: 'asc' },
    });

    if (materials.length === 0)
      throw new NotFoundException(
        'Material with specified code not found for this order.',
      );

    const materialToUpdate = materials.find(m => m.Issue_stage < m.Required_Qty);

    if (!materialToUpdate) {
      throw new BadRequestException('Cannot exceed the Required_Qty value (all records full)');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';

    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: materialToUpdate.ID },
      data: {
        Issue_stage: { increment: 1 },
        UpdatedBy: userName,
        UpdatedDate: new Date(),
      },
    });

    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber: salesOrder.saleOrderNumber },
      select: { Issue_stage: true, Required_Qty: true },
    });

    const allCompleted = allMaterials.every(
      (m) => m.Issue_stage >= m.Required_Qty,
    );
    let issueStageCompleted = false;

    if (allCompleted) {
      const updatedOrder = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: 'W105', assignedUserId: null, UpdatedBy: userName, UpdatedDate: new Date(),},
      });
      issueStageCompleted = true;
      await this.prisma.sO_Status_Stepper.updateMany({
        where: {
          salesOrderNumber: updatedOrder.saleOrderNumber,
          status: "Issued"
        },
        data: {
          createdDateTime: new Date(),
          updatedBy: userName
        }
      });
    }

    return convertBigInts({
      message: 'Issue_stage incremented successfully',
      updatedMaterial,
      issueStageCompleted,
    });
  }

  async updateIssueStage(
    orderId: number,
    materialCode: string,
    newIssueStage: number,
    userId: number,
    userRole: string,
    materialId?: number,
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);

    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true },
    });

    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    let material;
    if (materialId) {
      material = await this.prisma.eRP_Material_Data.findUnique({
        where: { ID: materialId },
      });
    } else {
      material = await this.prisma.eRP_Material_Data.findFirst({
        where: {
          Material_Code: materialCode,
          saleOrderNumber: salesOrder.saleOrderNumber,
        },
      });
    }

    if (!material)
      throw new NotFoundException(
        'Material with specified code not found for this order.',
      );

    if (newIssueStage > material.Required_Qty) {
      throw new BadRequestException('Cannot exceed the Required_Qty value');
    }
    if (newIssueStage < 0) {
      throw new BadRequestException('Issue_stage cannot be negative');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';

    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: material.ID },
      data: {
        Issue_stage: newIssueStage,
        UpdatedBy: userName,
        UpdatedDate: new Date(),
      },
      select: {
        ID: true,
        Material_Code: true,
        Issue_stage: true,
        Required_Qty: true,
        Packing_stage: true,
      },
    });

    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber: salesOrder.saleOrderNumber },
      select: { Issue_stage: true, Required_Qty: true },
    });

    const allCompleted = allMaterials.every(
      (m) => m.Issue_stage >= m.Required_Qty,
    );
    let issueStageCompleted = false;
    if (allCompleted) {
      const updatedOrder = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: 'W105', assignedUserId: null, UpdatedBy: userName, UpdatedDate: new Date(), },
      });
      issueStageCompleted = true;
      await this.prisma.sO_Status_Stepper.updateMany({
        where: {
          salesOrderNumber: updatedOrder.saleOrderNumber,
          status: "Issued"
        },
        data: {
          createdDateTime: new Date(),
          updatedBy: userName
        }
      });
    }

    return convertBigInts({
      message: 'Issue_stage updated successfully',
      updatedMaterial,
      issueStageCompleted,
    });
  }

  async incrementPackingStage(
    orderId: number,
    materialCode: string,
    userId: number,
    userRole: string,
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true },
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        OR: [
          { Material_Code: { equals: materialCode, mode: 'insensitive' } },
          { Mapping_Barcode: { equals: materialCode, mode: 'insensitive' } },
        ]
      },
      orderBy: { ID: 'asc' },
    });

    if (materials.length === 0)
      throw new NotFoundException(
        'Material with specified code not found for this order.',
      );

    const materialToUpdate = materials.find(m => {
        const cap = Math.min(m.Required_Qty, m.Issue_stage);
        return m.Packing_stage < cap;
    });

    if (!materialToUpdate) {
      throw new BadRequestException(
        'Cannot exceed the min(Required_Qty, Issue_stage) cap (all records full)',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';

    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: materialToUpdate.ID },
      data: {
        Packing_stage: { increment: 1 },
        UpdatedBy: userName,
        UpdatedDate: new Date(),
      },
    });

    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber: salesOrder.saleOrderNumber },
      select: { Packing_stage: true, Required_Qty: true },
    });

    const allPacked = allMaterials.every(
      (m) => m.Packing_stage >= m.Required_Qty,
    );
    let packingStageCompleted = false;
    if (allPacked) {
      const updatedOrder = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: 'F105', assignedUserId: null, UpdatedBy: userName, UpdatedDate: new Date(), },
      });
      packingStageCompleted = true;
      await this.prisma.sO_Status_Stepper.updateMany({
        where: {
          salesOrderNumber: updatedOrder.saleOrderNumber,
          status: "Packed"
        },
        data: {
          createdDateTime: new Date(),
          updatedBy: userName
        }
      });
    }

    return convertBigInts({
      message: 'Packing_stage incremented successfully',
      updatedMaterial,
      packingStageCompleted,
    });
  }

  async bulkAcceptGroup(
    orderId: number,
    group: string,
    stageType: 'issue' | 'packing',
    userId: number,
    userRole: string,
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true },
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const userName = await this.getUserName(userId);
    const now = new Date();

    const groupItems = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        Group: group,
      },
    });

    if (groupItems.length === 0) {
      throw new NotFoundException(`No items found for group '${group}' in this order.`);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of groupItems) {
        if (stageType === 'issue') {
          if (item.Issue_stage < item.Required_Qty) {
            await tx.eRP_Material_Data.update({
              where: { ID: item.ID },
              data: {
                Issue_stage: item.Required_Qty,
                UpdatedBy: userName,
                UpdatedDate: now,
              },
            });
          }
        } else {
          const cap = Math.min(item.Required_Qty, item.Issue_stage);
          
          if (item.Packing_stage < item.Required_Qty) {
             await tx.eRP_Material_Data.update({
              where: { ID: item.ID },
              data: {
                Packing_stage: item.Required_Qty, 
                UpdatedBy: userName,
                UpdatedDate: now,
              },
            });
          }
        }
      }
    });

    return this._checkOrderCompletion(salesOrder.saleOrderNumber, orderId, userName);
  }

  private async _checkOrderCompletion(soNumber: string, orderId: number, userName: string) {
    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber: soNumber },
      select: { Issue_stage: true, Packing_stage: true, Required_Qty: true },
    });

    const issueStageCompleted = allMaterials.every(
      (m) => m.Issue_stage >= m.Required_Qty
    );

    let isIssueComplete = false;
    let isPackingComplete = false;

    if (issueStageCompleted) {
      const current = await this.prisma.salesOrder.findUnique({ where: { id: orderId } });
      if (current && current.status !== 'W105' && current.status !== 'F105' && current.status !== 'Dispatched') {
         await this.prisma.salesOrder.update({
          where: { id: orderId },
          data: { status: 'W105', assignedUserId: null, UpdatedBy: userName, UpdatedDate: new Date() },
        });
        await this.prisma.sO_Status_Stepper.updateMany({
          where: { salesOrderNumber: soNumber, status: "Issued" },
          data: { createdDateTime: new Date(), updatedBy: userName }
        });
        isIssueComplete = true;
      }
    }

    const packingStageCompleted = allMaterials.every(
      (m) => m.Packing_stage >= m.Required_Qty
    );

    if (packingStageCompleted) {
        await this.prisma.salesOrder.update({
          where: { id: orderId },
          data: { status: 'F105', assignedUserId: null, UpdatedBy: userName, UpdatedDate: new Date() },
        });
        await this.prisma.sO_Status_Stepper.updateMany({
          where: { salesOrderNumber: soNumber, status: "Packed" },
          data: { createdDateTime: new Date(), updatedBy: userName }
        });
        isPackingComplete = true;
    }

    return {
      message: 'Group updated successfully',
      issueStageCompleted: isIssueComplete,
      packingStageCompleted: isPackingComplete
    };
  }

  async updatePackingStage(
    orderId: number,
    materialCode: string,
    newPackingStage: number,
    userId: number,
    userRole: string,
    materialId?: number,
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);
    if (newPackingStage < 0) {
      throw new BadRequestException('Packing_stage cannot be negative');
    }

    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true },
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    let material;
    if (materialId) {
      material = await this.prisma.eRP_Material_Data.findUnique({
        where: { ID: materialId },
      });
    } else {
      material = await this.prisma.eRP_Material_Data.findFirst({
        where: {
          Material_Code: materialCode,
          saleOrderNumber: salesOrder.saleOrderNumber,
        },
      });
    }

    if (!material)
      throw new NotFoundException(
        'Material with specified code not found for this order.',
      );

    const cap = Math.min(material.Required_Qty, material.Issue_stage);
    if (newPackingStage > cap) {
      throw new BadRequestException(
        `Packing_stage cannot exceed min(Required_Qty, Issue_stage) = ${cap}`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';

    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: material.ID },
      data: {
        Packing_stage: newPackingStage,
        UpdatedBy: userName,
        UpdatedDate: new Date(),
      },
    });

    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber: salesOrder.saleOrderNumber },
      select: { Packing_stage: true, Required_Qty: true },
    });

    const allPacked = allMaterials.every(
      (m) => m.Packing_stage >= m.Required_Qty,
    );
    let packingStageCompleted = false;
    if (allPacked) {
      const updatedOrder = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: 'F105', assignedUserId: null, UpdatedBy: userName, UpdatedDate: new Date(),},
      });
      packingStageCompleted = true;
      await this.prisma.sO_Status_Stepper.updateMany({
        where: {
          salesOrderNumber: updatedOrder.saleOrderNumber,
          status: "Packed"
        },
        data: {
          createdDateTime: new Date(),
          updatedBy: userName
        }
      });
    }

    return convertBigInts({
      message: 'Packing_stage updated successfully',
      updatedMaterial,
      packingStageCompleted,
    });
  }

  async updateRemarks(
    orderId: number,
    materialId: number,
    remarks: string | undefined,
    userId: number,
    userRole: string,
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';

    const valueToSave = remarks && remarks.trim().length > 0 ? remarks : null;

    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: materialId },
      data: {
        Remarks: valueToSave,
        UpdatedBy: userName,
        UpdatedDate: new Date(),
      },
    });

    return convertBigInts({
      message: 'Remarks updated successfully',
      updatedMaterial,
    });
  }

  async acceptAllIssueStage(
    orderId: number,
    userId: number,
    userRole: string,
  ) {
    if (userRole !== 'ADMIN') {
        throw new ForbiddenException('Only Admins can perform this action');
    }
    
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true },
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const userName = await this.getUserName(userId);
    const now = new Date();

    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber: salesOrder.saleOrderNumber },
    });

    if (materials.length === 0) {
       throw new NotFoundException('No materials found for this order');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of materials) {
        if (item.Issue_stage < item.Required_Qty) {
          await tx.eRP_Material_Data.update({
            where: { ID: item.ID },
            data: {
              Issue_stage: item.Required_Qty,
              UpdatedBy: userName,
              UpdatedDate: now,
            },
          });
        }
      }
    });

    return this._checkOrderCompletion(salesOrder.saleOrderNumber, orderId, userName);
  }
}