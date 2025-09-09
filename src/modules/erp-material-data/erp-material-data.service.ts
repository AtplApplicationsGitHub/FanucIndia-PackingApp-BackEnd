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
    // Convert BigInt to string, as JavaScript's Number can lose precision with large numbers.
    // The frontend can parse this back to a number if needed.
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

// Helper function to verify ownership
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

    const material = await this.prisma.eRP_Material_Data.findFirst({
      where: {
        Material_Code: materialCode,
        saleOrderNumber: salesOrder.saleOrderNumber,
      },
    });

    if (!material)
      throw new NotFoundException(
        'Material with specified code not found for this order.',
      );

    if (material.Issue_stage >= material.Required_Qty) {
      throw new BadRequestException('Cannot exceed the Required_Qty value');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';
    
    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: material.ID },
      data: { 
        Issue_stage: { increment: 1 },
        UpdatedBy: userName,
        UpdatedDate: new Date(),
      },
    });

    // Check if all materials for this sales order are fully issued and update status to F105
    const allMaterials = await this.prisma.eRP_Material_Data.findMany({
      where: { saleOrderNumber: salesOrder.saleOrderNumber },
      select: { Issue_stage: true, Required_Qty: true },
    });

    const allCompleted = allMaterials.every(
      (m) => m.Issue_stage >= m.Required_Qty,
    );
    let issueStageCompleted = false;
    if (allCompleted) {
      await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: 'F105', assignedUserId: null },
      });
      issueStageCompleted = true;
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
  ) {
    await verifyOrderAccess(this.prisma, orderId, userId, userRole);

    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true },
    });

    if (!salesOrder) throw new NotFoundException('Sales Order not found');

    const material = await this.prisma.eRP_Material_Data.findFirst({
      where: {
        Material_Code: materialCode,
        saleOrderNumber: salesOrder.saleOrderNumber,
      },
    });

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
      await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: 'F105', assignedUserId: null },
      });
      issueStageCompleted = true; 
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

    const material = await this.prisma.eRP_Material_Data.findFirst({
      where: {
        Material_Code: materialCode,
        saleOrderNumber: salesOrder.saleOrderNumber,
      },
    });

    if (!material)
      throw new NotFoundException(
        'Material with specified code not found for this order.',
      );

    const cap = Math.min(material.Required_Qty, material.Issue_stage);
    if (material.Packing_stage >= cap) {
      throw new BadRequestException(
        'Cannot exceed the min(Required_Qty, Issue_stage) cap',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? user.name : 'System';

    const updatedMaterial = await this.prisma.eRP_Material_Data.update({
      where: { ID: material.ID },
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
      await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { assignedUserId: null },
      });
      packingStageCompleted = true;
    }

    return convertBigInts({
      message: 'Packing_stage incremented successfully',
      updatedMaterial,
      packingStageCompleted,
    });
  }

  async updatePackingStage(
    orderId: number,
    materialCode: string,
    newPackingStage: number,
    userId: number,
    userRole: string,
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

    const material = await this.prisma.eRP_Material_Data.findFirst({
      where: {
        Material_Code: materialCode,
        saleOrderNumber: salesOrder.saleOrderNumber,
      },
    });

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
      await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { assignedUserId: null },
      });
      packingStageCompleted = true;
    }

    return convertBigInts({
      message: 'Packing_stage updated successfully',
      updatedMaterial,
      packingStageCompleted,
    });
  }
}