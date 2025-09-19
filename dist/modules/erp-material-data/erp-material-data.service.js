"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ErpMaterialDataService", {
    enumerable: true,
    get: function() {
        return ErpMaterialDataService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function convertBigInts(obj) {
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
        for(const key in obj){
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = convertBigInts(obj[key]);
            }
        }
    }
    return obj;
}
async function verifyOrderAccess(prisma, orderId, userId, userRole) {
    if (userRole === 'ADMIN') {
        const order = await prisma.salesOrder.findUnique({
            where: {
                id: orderId
            }
        });
        if (!order) throw new _common.NotFoundException('Sales Order not found');
        return {
            id: orderId
        };
    }
    const order = await prisma.salesOrder.findFirst({
        where: {
            id: orderId,
            assignedUserId: userId
        }
    });
    if (!order) {
        throw new _common.ForbiddenException('You do not have permission to access this order.');
    }
    return {
        id: orderId
    };
}
let ErpMaterialDataService = class ErpMaterialDataService {
    async getMaterialsByOrderId(orderId, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: {
                id: orderId
            },
            select: {
                saleOrderNumber: true
            }
        });
        if (!salesOrder) throw new _common.NotFoundException('Sales Order not found');
        const materials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber
            },
            orderBy: {
                ID: 'asc'
            }
        });
        return convertBigInts(materials);
    }
    async incrementIssueStage(orderId, materialCode, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: {
                id: orderId
            },
            select: {
                saleOrderNumber: true
            }
        });
        if (!salesOrder) throw new _common.NotFoundException('Sales Order not found');
        const material = await this.prisma.eRP_Material_Data.findFirst({
            where: {
                Material_Code: materialCode,
                saleOrderNumber: salesOrder.saleOrderNumber
            }
        });
        if (!material) throw new _common.NotFoundException('Material with specified code not found for this order.');
        if (material.Issue_stage >= material.Required_Qty) {
            throw new _common.BadRequestException('Cannot exceed the Required_Qty value');
        }
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user ? user.name : 'System';
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: {
                ID: material.ID
            },
            data: {
                Issue_stage: {
                    increment: 1
                },
                UpdatedBy: userName,
                UpdatedDate: new Date()
            }
        });
        const allMaterials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber
            },
            select: {
                Issue_stage: true,
                Required_Qty: true
            }
        });
        const allCompleted = allMaterials.every((m)=>m.Issue_stage >= m.Required_Qty);
        let issueStageCompleted = false;
        if (allCompleted) {
            await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    status: 'F105',
                    assignedUserId: null
                }
            });
            issueStageCompleted = true;
        }
        return convertBigInts({
            message: 'Issue_stage incremented successfully',
            updatedMaterial,
            issueStageCompleted
        });
    }
    async updateIssueStage(orderId, materialCode, newIssueStage, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: {
                id: orderId
            },
            select: {
                saleOrderNumber: true
            }
        });
        if (!salesOrder) throw new _common.NotFoundException('Sales Order not found');
        const material = await this.prisma.eRP_Material_Data.findFirst({
            where: {
                Material_Code: materialCode,
                saleOrderNumber: salesOrder.saleOrderNumber
            }
        });
        if (!material) throw new _common.NotFoundException('Material with specified code not found for this order.');
        if (newIssueStage > material.Required_Qty) {
            throw new _common.BadRequestException('Cannot exceed the Required_Qty value');
        }
        if (newIssueStage < 0) {
            throw new _common.BadRequestException('Issue_stage cannot be negative');
        }
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user ? user.name : 'System';
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: {
                ID: material.ID
            },
            data: {
                Issue_stage: newIssueStage,
                UpdatedBy: userName,
                UpdatedDate: new Date()
            },
            select: {
                ID: true,
                Material_Code: true,
                Issue_stage: true,
                Required_Qty: true,
                Packing_stage: true
            }
        });
        const allMaterials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber
            },
            select: {
                Issue_stage: true,
                Required_Qty: true
            }
        });
        const allCompleted = allMaterials.every((m)=>m.Issue_stage >= m.Required_Qty);
        let issueStageCompleted = false;
        if (allCompleted) {
            await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    status: 'F105',
                    assignedUserId: null
                }
            });
            issueStageCompleted = true;
        }
        return convertBigInts({
            message: 'Issue_stage updated successfully',
            updatedMaterial,
            issueStageCompleted
        });
    }
    async incrementPackingStage(orderId, materialCode, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: {
                id: orderId
            },
            select: {
                saleOrderNumber: true
            }
        });
        if (!salesOrder) throw new _common.NotFoundException('Sales Order not found');
        const material = await this.prisma.eRP_Material_Data.findFirst({
            where: {
                Material_Code: materialCode,
                saleOrderNumber: salesOrder.saleOrderNumber
            }
        });
        if (!material) throw new _common.NotFoundException('Material with specified code not found for this order.');
        const cap = Math.min(material.Required_Qty, material.Issue_stage);
        if (material.Packing_stage >= cap) {
            throw new _common.BadRequestException('Cannot exceed the min(Required_Qty, Issue_stage) cap');
        }
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user ? user.name : 'System';
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: {
                ID: material.ID
            },
            data: {
                Packing_stage: {
                    increment: 1
                },
                UpdatedBy: userName,
                UpdatedDate: new Date()
            }
        });
        const allMaterials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber
            },
            select: {
                Packing_stage: true,
                Required_Qty: true
            }
        });
        const allPacked = allMaterials.every((m)=>m.Packing_stage >= m.Required_Qty);
        let packingStageCompleted = false;
        if (allPacked) {
            await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    assignedUserId: null
                }
            });
            packingStageCompleted = true;
        }
        return convertBigInts({
            message: 'Packing_stage incremented successfully',
            updatedMaterial,
            packingStageCompleted
        });
    }
    async updatePackingStage(orderId, materialCode, newPackingStage, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        if (newPackingStage < 0) {
            throw new _common.BadRequestException('Packing_stage cannot be negative');
        }
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: {
                id: orderId
            },
            select: {
                saleOrderNumber: true
            }
        });
        if (!salesOrder) throw new _common.NotFoundException('Sales Order not found');
        const material = await this.prisma.eRP_Material_Data.findFirst({
            where: {
                Material_Code: materialCode,
                saleOrderNumber: salesOrder.saleOrderNumber
            }
        });
        if (!material) throw new _common.NotFoundException('Material with specified code not found for this order.');
        const cap = Math.min(material.Required_Qty, material.Issue_stage);
        if (newPackingStage > cap) {
            throw new _common.BadRequestException(`Packing_stage cannot exceed min(Required_Qty, Issue_stage) = ${cap}`);
        }
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user ? user.name : 'System';
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: {
                ID: material.ID
            },
            data: {
                Packing_stage: newPackingStage,
                UpdatedBy: userName,
                UpdatedDate: new Date()
            }
        });
        const allMaterials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber
            },
            select: {
                Packing_stage: true,
                Required_Qty: true
            }
        });
        const allPacked = allMaterials.every((m)=>m.Packing_stage >= m.Required_Qty);
        let packingStageCompleted = false;
        if (allPacked) {
            await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    assignedUserId: null
                }
            });
            packingStageCompleted = true;
        }
        return convertBigInts({
            message: 'Packing_stage updated successfully',
            updatedMaterial,
            packingStageCompleted
        });
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
ErpMaterialDataService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], ErpMaterialDataService);

//# sourceMappingURL=erp-material-data.service.js.map