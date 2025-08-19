"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpMaterialDataService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
async function verifyOrderAccess(prisma, orderId, userId, userRole) {
    if (userRole === 'admin') {
        const order = await prisma.salesOrder.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Sales Order not found');
        return { id: orderId };
    }
    const order = await prisma.salesOrder.findFirst({
        where: { id: orderId, assignedUserId: userId },
    });
    if (!order) {
        throw new common_1.ForbiddenException('You do not have permission to access this order.');
    }
    return { id: orderId };
}
function convertBigIntToString(obj) {
    if (Array.isArray(obj)) {
        return obj.map(convertBigIntToString);
    }
    else if (obj && typeof obj === 'object') {
        const res = {};
        for (const [key, value] of Object.entries(obj)) {
            res[key] =
                typeof value === 'bigint'
                    ? value.toString()
                    : convertBigIntToString(value);
        }
        return res;
    }
    return obj;
}
let ErpMaterialDataService = class ErpMaterialDataService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMaterialsByOrderId(orderId, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: { id: orderId },
            select: { saleOrderNumber: true },
        });
        if (!salesOrder)
            throw new common_1.NotFoundException('Sales Order not found');
        const materials = await this.prisma.eRP_Material_Data.findMany({
            where: { saleOrderNumber: salesOrder.saleOrderNumber },
            orderBy: { ID: 'asc' },
        });
        return convertBigIntToString(materials);
    }
    async incrementIssueStage(orderId, materialCode, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: { id: orderId },
            select: { saleOrderNumber: true },
        });
        if (!salesOrder)
            throw new common_1.NotFoundException('Sales Order not found');
        const material = await this.prisma.eRP_Material_Data.findFirst({
            where: {
                Material_Code: materialCode,
                saleOrderNumber: salesOrder.saleOrderNumber,
            },
        });
        if (!material)
            throw new common_1.NotFoundException('Material with specified code not found for this order.');
        if (material.Issue_stage >= material.Required_Qty) {
            throw new common_1.BadRequestException('Cannot exceed the Required_Qty value');
        }
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: { ID: material.ID },
            data: { Issue_stage: { increment: 1 } },
        });
        const allMaterials = await this.prisma.eRP_Material_Data.findMany({
            where: { saleOrderNumber: salesOrder.saleOrderNumber },
            select: { Issue_stage: true, Required_Qty: true },
        });
        const allCompleted = allMaterials.every((m) => m.Issue_stage >= m.Required_Qty);
        if (allCompleted) {
            await this.prisma.salesOrder.update({
                where: { id: orderId },
                data: { status: 'F105' },
            });
        }
        return convertBigIntToString({
            message: 'Issue_stage incremented successfully',
            updatedMaterial,
        });
    }
    async updateIssueStage(orderId, materialCode, newIssueStage, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: { id: orderId },
            select: { saleOrderNumber: true },
        });
        if (!salesOrder)
            throw new common_1.NotFoundException('Sales Order not found');
        const material = await this.prisma.eRP_Material_Data.findFirst({
            where: {
                Material_Code: materialCode,
                saleOrderNumber: salesOrder.saleOrderNumber,
            },
        });
        if (!material)
            throw new common_1.NotFoundException('Material with specified code not found for this order.');
        if (newIssueStage > material.Required_Qty) {
            throw new common_1.BadRequestException('Cannot exceed the Required_Qty value');
        }
        if (newIssueStage < 0) {
            throw new common_1.BadRequestException('Issue_stage cannot be negative');
        }
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: { ID: material.ID },
            data: { Issue_stage: newIssueStage },
        });
        const allMaterials = await this.prisma.eRP_Material_Data.findMany({
            where: { saleOrderNumber: salesOrder.saleOrderNumber },
            select: { Issue_stage: true, Required_Qty: true },
        });
        const allCompleted = allMaterials.every((m) => m.Issue_stage >= m.Required_Qty);
        if (allCompleted) {
            await this.prisma.salesOrder.update({
                where: { id: orderId },
                data: { status: 'F105' },
            });
        }
        return convertBigIntToString({
            message: 'Issue_stage updated successfully',
            updatedMaterial,
        });
    }
    async incrementPackingStage(orderId, materialCode, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: { id: orderId },
            select: { saleOrderNumber: true },
        });
        if (!salesOrder)
            throw new common_1.NotFoundException('Sales Order not found');
        const material = await this.prisma.eRP_Material_Data.findFirst({
            where: {
                Material_Code: materialCode,
                saleOrderNumber: salesOrder.saleOrderNumber,
            },
        });
        if (!material)
            throw new common_1.NotFoundException('Material with specified code not found for this order.');
        const cap = Math.min(material.Required_Qty, material.Issue_stage);
        if (material.Packing_stage >= cap) {
            throw new common_1.BadRequestException('Cannot exceed the min(Required_Qty, Issue_stage) cap');
        }
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: { ID: material.ID },
            data: {
                Packing_stage: { increment: 1 },
                UpdatedDate: new Date(),
            },
        });
        return convertBigIntToString({
            message: 'Packing_stage incremented successfully',
            updatedMaterial,
        });
    }
    async updatePackingStage(orderId, materialCode, newPackingStage, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        if (newPackingStage < 0) {
            throw new common_1.BadRequestException('Packing_stage cannot be negative');
        }
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: { id: orderId },
            select: { saleOrderNumber: true },
        });
        if (!salesOrder)
            throw new common_1.NotFoundException('Sales Order not found');
        const material = await this.prisma.eRP_Material_Data.findFirst({
            where: {
                Material_Code: materialCode,
                saleOrderNumber: salesOrder.saleOrderNumber,
            },
        });
        if (!material)
            throw new common_1.NotFoundException('Material with specified code not found for this order.');
        const cap = Math.min(material.Required_Qty, material.Issue_stage);
        if (newPackingStage > cap) {
            throw new common_1.BadRequestException(`Packing_stage cannot exceed min(Required_Qty, Issue_stage) = ${cap}`);
        }
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: { ID: material.ID },
            data: {
                Packing_stage: newPackingStage,
                UpdatedDate: new Date(),
            },
        });
        return convertBigIntToString({
            message: 'Packing_stage updated successfully',
            updatedMaterial,
        });
    }
};
exports.ErpMaterialDataService = ErpMaterialDataService;
exports.ErpMaterialDataService = ErpMaterialDataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ErpMaterialDataService);
//# sourceMappingURL=erp-material-data.service.js.map