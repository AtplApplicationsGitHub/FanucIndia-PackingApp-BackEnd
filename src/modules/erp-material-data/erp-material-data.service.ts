import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import { EfficiencyService } from '../efficiency/efficiency.service';

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
    where: {
      id: orderId,
      OR: [
        { issueAssignedUserId: userId },
        { packingAssignedUserId: userId },
        { assignedUserId: userId },
      ],
    },
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly efficiencyService: EfficiencyService,
  ) {}

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
      select: { saleOrderNumber: true, outboundDelivery: true }, // Added OBD
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter by the correct DB column
      },
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
      select: {
        saleOrderNumber: true,
        outboundDelivery: true,
        packingAssignedUserId: true,
      }, // Added OBD
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter
        OR: [
          { Material_Code: { equals: materialCode, mode: 'insensitive' } },
          { Mapping_Barcode: { equals: materialCode, mode: 'insensitive' } },
        ],
      },
      orderBy: { ID: 'asc' },
    });

    if (materials.length === 0)
      throw new NotFoundException(
        'Material with specified code not found for this order.',
      );

    const materialToUpdate = materials.find(
      (m) => m.Issue_stage < m.Required_Qty,
    );

    if (!materialToUpdate) {
      throw new BadRequestException(
        'Cannot exceed the Required_Qty value (all records full)',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';

    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: materialToUpdate.ID },
      data: {
        Issue_stage: { increment: 1 },
        UpdatedBy: userName,
        UpdatedDate: new Date(),
        IssueUpdatedBy: userName,
        IssueUpdatedDate: new Date(),
      },
    });

    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter
      },
      select: { Issue_stage: true, Required_Qty: true },
    });

    const allCompleted = allMaterials.every(
      (m) => m.Issue_stage >= m.Required_Qty,
    );
    let issueStageCompleted = false;

    if (allCompleted) {
      const updatedOrder = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: {
          status: 'W105',
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
      });
      issueStageCompleted = true;
      await this.efficiencyService.recordStageCompletion(orderId, 'Issue');
      await this.prisma.sO_Status_Stepper.upsert({
        where: {
          salesOrderId_status: {
            salesOrderId: updatedOrder.id,
            status: 'Issued',
          },
        },
        update: { createdDateTime: new Date(), updatedBy: userName },
        create: {
          salesOrderNumber: updatedOrder.saleOrderNumber,
          salesOrderId: updatedOrder.id,
          status: 'Issued',
          createdDateTime: new Date(),
          updatedBy: userName,
        },
      });

      if (updatedOrder.packingAssignedUserId) {
        await this.prisma.sO_Status_Stepper.upsert({
          where: {
            salesOrderId_status: {
              salesOrderId: updatedOrder.id,
              status: 'Under Packing',
            },
          },
          update: { createdDateTime: new Date(), updatedBy: userName },
          create: {
            salesOrderNumber: updatedOrder.saleOrderNumber,
            salesOrderId: updatedOrder.id,
            status: 'Under Packing',
            createdDateTime: new Date(),
            updatedBy: userName,
          },
        });
      }
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
      select: {
        saleOrderNumber: true,
        outboundDelivery: true,
        packingAssignedUserId: true,
      }, // Added OBD
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
          FG_OBD: salesOrder.outboundDelivery || '', // Filter
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
        IssueUpdatedBy: userName,
        IssueUpdatedDate: new Date(),
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
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter
      },
      select: { Issue_stage: true, Required_Qty: true },
    });

    const allCompleted = allMaterials.every(
      (m) => m.Issue_stage >= m.Required_Qty,
    );
    let issueStageCompleted = false;
    if (allCompleted) {
      const updatedOrder = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: {
          status: 'W105',
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
      });
      issueStageCompleted = true;
      await this.efficiencyService.recordStageCompletion(orderId, 'Issue');
      await this.prisma.sO_Status_Stepper.upsert({
        where: {
          salesOrderId_status: {
            salesOrderId: updatedOrder.id,
            status: 'Issued',
          },
        },
        update: { createdDateTime: new Date(), updatedBy: userName },
        create: {
          salesOrderNumber: updatedOrder.saleOrderNumber,
          salesOrderId: updatedOrder.id,
          status: 'Issued',
          createdDateTime: new Date(),
          updatedBy: userName,
        },
      });

      if (updatedOrder.packingAssignedUserId) {
        await this.prisma.sO_Status_Stepper.upsert({
          where: {
            salesOrderId_status: {
              salesOrderId: updatedOrder.id,
              status: 'Under Packing',
            },
          },
          update: { createdDateTime: new Date(), updatedBy: userName },
          create: {
            salesOrderNumber: updatedOrder.saleOrderNumber,
            salesOrderId: updatedOrder.id,
            status: 'Under Packing',
            createdDateTime: new Date(),
            updatedBy: userName,
          },
        });
      }
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
      select: { saleOrderNumber: true, outboundDelivery: true }, // Added OBD
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter
        OR: [
          { Material_Code: { equals: materialCode, mode: 'insensitive' } },
          { Mapping_Barcode: { equals: materialCode, mode: 'insensitive' } },
        ],
      },
      orderBy: { ID: 'asc' },
    });

    if (materials.length === 0)
      throw new NotFoundException(
        'Material with specified code not found for this order.',
      );

    const materialToUpdate = materials.find((m) => {
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
        PackingUpdatedBy: userName,
        PackingUpdatedDate: new Date(),
      },
    });

    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter
      },
      select: { Packing_stage: true, Required_Qty: true },
    });

    const allPacked = allMaterials.every(
      (m) => m.Packing_stage >= m.Required_Qty,
    );
    let packingStageCompleted = false;
    if (allPacked) {
      const updatedOrder = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: {
          status: 'F105',
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
      });
      packingStageCompleted = true;
      await this.efficiencyService.recordStageCompletion(orderId, 'Packing');
      await this.prisma.sO_Status_Stepper.upsert({
        where: {
          salesOrderId_status: {
            salesOrderId: updatedOrder.id,
            status: 'Packed',
          },
        },
        update: { createdDateTime: new Date(), updatedBy: userName },
        create: {
          salesOrderNumber: updatedOrder.saleOrderNumber,
          salesOrderId: updatedOrder.id,
          status: 'Packed',
          createdDateTime: new Date(),
          updatedBy: userName,
        },
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
      select: { saleOrderNumber: true, outboundDelivery: true }, // Added OBD
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const userName = await this.getUserName(userId);
    const now = new Date();

    const groupItems = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter
        Group: group,
      },
    });

    if (groupItems.length === 0) {
      throw new NotFoundException(
        `No items found for group '${group}' in this order.`,
      );
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
                IssueUpdatedBy: userName,
                IssueUpdatedDate: now,
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
                PackingUpdatedBy: userName,
                PackingUpdatedDate: now,
              },
            });
          }
        }
      }
    });

    return this._checkOrderCompletion(
      salesOrder.saleOrderNumber,
      salesOrder.outboundDelivery || '',
      orderId,
      userName,
    );
  }

  private async _checkOrderCompletion(
    soNumber: string,
    outboundDelivery: string,
    orderId: number,
    userName: string,
  ) {
    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: soNumber,
        FG_OBD: outboundDelivery, // Passed from calling functions
      },
      select: { Issue_stage: true, Packing_stage: true, Required_Qty: true },
    });

    const issueStageCompleted = allMaterials.every(
      (m) => m.Issue_stage >= m.Required_Qty,
    );

    let isIssueComplete = false;
    let isPackingComplete = false;

    if (issueStageCompleted) {
      const current = await this.prisma.salesOrder.findUnique({
        where: { id: orderId },
      });
      if (
        current &&
        current.status !== 'W105' &&
        current.status !== 'F105' &&
        current.status !== 'Dispatched'
      ) {
        await this.prisma.salesOrder.update({
          where: { id: orderId },
          data: {
            status: 'W105',
            UpdatedBy: userName,
            UpdatedDate: new Date(),
          },
        });
        await this.prisma.sO_Status_Stepper.upsert({
          where: {
            salesOrderId_status: { salesOrderId: orderId, status: 'Issued' },
          },
          update: { createdDateTime: new Date(), updatedBy: userName },
          create: {
            salesOrderNumber: soNumber,
            salesOrderId: orderId,
            status: 'Issued',
            createdDateTime: new Date(),
            updatedBy: userName,
          },
        });
        isIssueComplete = true;

        if (current.packingAssignedUserId) {
          await this.prisma.sO_Status_Stepper.upsert({
            where: {
              salesOrderId_status: {
                salesOrderId: orderId,
                status: 'Under Packing',
              },
            },
            update: { createdDateTime: new Date(), updatedBy: userName },
            create: {
              salesOrderNumber: soNumber,
              salesOrderId: orderId,
              status: 'Under Packing',
              createdDateTime: new Date(),
              updatedBy: userName,
            },
          });
        }
      }
    }

    const packingStageCompleted = allMaterials.every(
      (m) => m.Packing_stage >= m.Required_Qty,
    );

    if (packingStageCompleted) {
      await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: {
          status: 'F105',
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
      });
      await this.prisma.sO_Status_Stepper.upsert({
        where: {
          salesOrderId_status: { salesOrderId: orderId, status: 'Packed' },
        },
        update: { createdDateTime: new Date(), updatedBy: userName },
        create: {
          salesOrderNumber: soNumber,
          salesOrderId: orderId,
          status: 'Packed',
          createdDateTime: new Date(),
          updatedBy: userName,
        },
      });
      isPackingComplete = true;
    }

    if (isIssueComplete) {
      await this.efficiencyService.recordStageCompletion(orderId, 'Issue');
    }
    if (isPackingComplete) {
      await this.efficiencyService.recordStageCompletion(orderId, 'Packing');
    }

    return {
      message: 'Group updated successfully',
      issueStageCompleted: isIssueComplete,
      packingStageCompleted: isPackingComplete,
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
      select: { saleOrderNumber: true, outboundDelivery: true }, // Added OBD
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
          FG_OBD: salesOrder.outboundDelivery || '', // Filter
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
        PackingUpdatedBy: userName,
        PackingUpdatedDate: new Date(),
      },
    });

    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter
      },
      select: { Packing_stage: true, Required_Qty: true },
    });

    const allPacked = allMaterials.every(
      (m) => m.Packing_stage >= m.Required_Qty,
    );
    let packingStageCompleted = false;
    if (allPacked) {
      const updatedOrder = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: {
          status: 'F105',
          UpdatedBy: userName,
          UpdatedDate: new Date(),
        },
      });
      packingStageCompleted = true;
      await this.efficiencyService.recordStageCompletion(orderId, 'Packing');
      await this.prisma.sO_Status_Stepper.upsert({
        where: {
          salesOrderId_status: {
            salesOrderId: updatedOrder.id,
            status: 'Packed',
          },
        },
        update: { createdDateTime: new Date(), updatedBy: userName },
        create: {
          salesOrderNumber: updatedOrder.saleOrderNumber,
          salesOrderId: updatedOrder.id,
          status: 'Packed',
          createdDateTime: new Date(),
          updatedBy: userName,
        },
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

  async acceptAllIssueStage(orderId: number, userId: number, userRole: string) {
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Only Admins can perform this action');
    }

    await verifyOrderAccess(this.prisma, orderId, userId, userRole);
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true, outboundDelivery: true }, // Added OBD
    });
    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const userName = await this.getUserName(userId);
    const now = new Date();

    const materials = await this.prisma.eRP_Material_Data.findMany({
      where: {
        saleOrderNumber: salesOrder.saleOrderNumber,
        FG_OBD: salesOrder.outboundDelivery || '', // Filter
      },
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
              IssueUpdatedBy: userName,
              IssueUpdatedDate: now,
            },
          });
        }
      }
    });

    return this._checkOrderCompletion(
      salesOrder.saleOrderNumber,
      salesOrder.outboundDelivery || '',
      orderId,
      userName,
    );
  }

  async updateMapping(
    orderId: number,
    dto: UpdateMappingDto,
    userId: number,
    userRole: string,
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';

    const currentMaterial = await this.prisma.eRP_Material_Data.findUnique({
      where: { ID: dto.materialId },
    });

    if (!currentMaterial) {
      throw new NotFoundException('Material not found');
    }

    if (dto.mappingBarcode) {
      const barcodeToCheck = dto.mappingBarcode;

      const existsInMaster = await this.prisma.materialBarcode.findFirst({
        where: {
          OR: [
            { erpCode: { equals: barcodeToCheck, mode: 'insensitive' } },
            { mappingBarcode: { equals: barcodeToCheck, mode: 'insensitive' } },
          ],
        },
      });

      if (existsInMaster) {
        throw new BadRequestException(
          `The barcode '${barcodeToCheck}' already exists in the Master Data (MaterialBarcode).`,
        );
      }

      // Check 2: Include FG_OBD so we only prevent duplicates within the same split
      const existsInCurrentSO = await this.prisma.eRP_Material_Data.findFirst({
        where: {
          saleOrderNumber: currentMaterial.saleOrderNumber,
          FG_OBD: currentMaterial.FG_OBD, // <--- Prevents split conflict
          ID: { not: dto.materialId },
          OR: [
            { Material_Code: { equals: barcodeToCheck, mode: 'insensitive' } },
            {
              Mapping_Barcode: { equals: barcodeToCheck, mode: 'insensitive' },
            },
          ],
        },
      });

      if (existsInCurrentSO) {
        throw new BadRequestException(
          `The barcode '${barcodeToCheck}' is already used as a Material Code or Mapping Barcode in this Sales Order.`,
        );
      }
    }

    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: dto.materialId },
      data: {
        Mapping_Barcode: dto.mappingBarcode || null,
        Group: dto.group || null,
        UpdatedBy: userName,
        UpdatedDate: new Date(),
      },
    });

    const materialCode = currentMaterial.Material_Code;
    const existingMaster = await this.prisma.materialBarcode.findUnique({
      where: { erpCode: materialCode },
    });

    if (existingMaster) {
      await this.prisma.materialBarcode.update({
        where: { id: existingMaster.id },
        data: {
          mappingBarcode: dto.mappingBarcode || null,
        },
      });
    } else {
      await this.prisma.materialBarcode.create({
        data: {
          erpCode: materialCode,
          mappingBarcode: dto.mappingBarcode || null,
          group: dto.group || null,
          acceptBulkData: false,
          remarksRequired: false,
        },
      });
    }

    return convertBigInts({
      message: 'Mapping details updated successfully',
      updatedMaterial,
    });
  }
}
