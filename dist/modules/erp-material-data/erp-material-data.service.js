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
    async getUserName(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        return user?.name || 'System';
    }
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
        const materials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber,
                OR: [
                    {
                        Material_Code: {
                            equals: materialCode,
                            mode: 'insensitive'
                        }
                    },
                    {
                        Mapping_Barcode: {
                            equals: materialCode,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            orderBy: {
                ID: 'asc'
            }
        });
        if (materials.length === 0) throw new _common.NotFoundException('Material with specified code not found for this order.');
        const materialToUpdate = materials.find((m)=>m.Issue_stage < m.Required_Qty);
        if (!materialToUpdate) {
            throw new _common.BadRequestException('Cannot exceed the Required_Qty value (all records full)');
        }
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user ? user.name : 'System';
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: {
                ID: materialToUpdate.ID
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
            const updatedOrder = await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    status: 'W105',
                    assignedUserId: null,
                    UpdatedBy: userName,
                    UpdatedDate: new Date()
                }
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
            issueStageCompleted
        });
    }
    async updateIssueStage(orderId, materialCode, newIssueStage, userId, userRole, materialId) {
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
        let material;
        if (materialId) {
            material = await this.prisma.eRP_Material_Data.findUnique({
                where: {
                    ID: materialId
                }
            });
        } else {
            material = await this.prisma.eRP_Material_Data.findFirst({
                where: {
                    Material_Code: materialCode,
                    saleOrderNumber: salesOrder.saleOrderNumber
                }
            });
        }
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
            const updatedOrder = await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    status: 'W105',
                    assignedUserId: null,
                    UpdatedBy: userName,
                    UpdatedDate: new Date()
                }
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
        const materials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber,
                OR: [
                    {
                        Material_Code: {
                            equals: materialCode,
                            mode: 'insensitive'
                        }
                    },
                    {
                        Mapping_Barcode: {
                            equals: materialCode,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            orderBy: {
                ID: 'asc'
            }
        });
        if (materials.length === 0) throw new _common.NotFoundException('Material with specified code not found for this order.');
        const materialToUpdate = materials.find((m)=>{
            const cap = Math.min(m.Required_Qty, m.Issue_stage);
            return m.Packing_stage < cap;
        });
        if (!materialToUpdate) {
            throw new _common.BadRequestException('Cannot exceed the min(Required_Qty, Issue_stage) cap (all records full)');
        }
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user ? user.name : 'System';
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: {
                ID: materialToUpdate.ID
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
            const updatedOrder = await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    status: 'F105',
                    assignedUserId: null,
                    UpdatedBy: userName,
                    UpdatedDate: new Date()
                }
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
            packingStageCompleted
        });
    }
    async bulkAcceptGroup(orderId, group, stageType, userId, userRole) {
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
        const userName = await this.getUserName(userId);
        const now = new Date();
        const groupItems = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber,
                Group: group
            }
        });
        if (groupItems.length === 0) {
            throw new _common.NotFoundException(`No items found for group '${group}' in this order.`);
        }
        await this.prisma.$transaction(async (tx)=>{
            for (const item of groupItems){
                if (stageType === 'issue') {
                    if (item.Issue_stage < item.Required_Qty) {
                        await tx.eRP_Material_Data.update({
                            where: {
                                ID: item.ID
                            },
                            data: {
                                Issue_stage: item.Required_Qty,
                                UpdatedBy: userName,
                                UpdatedDate: now
                            }
                        });
                    }
                } else {
                    const cap = Math.min(item.Required_Qty, item.Issue_stage);
                    if (item.Packing_stage < item.Required_Qty) {
                        await tx.eRP_Material_Data.update({
                            where: {
                                ID: item.ID
                            },
                            data: {
                                Packing_stage: item.Required_Qty,
                                UpdatedBy: userName,
                                UpdatedDate: now
                            }
                        });
                    }
                }
            }
        });
        return this._checkOrderCompletion(salesOrder.saleOrderNumber, orderId, userName);
    }
    async _checkOrderCompletion(soNumber, orderId, userName) {
        const allMaterials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: soNumber
            },
            select: {
                Issue_stage: true,
                Packing_stage: true,
                Required_Qty: true
            }
        });
        const issueStageCompleted = allMaterials.every((m)=>m.Issue_stage >= m.Required_Qty);
        let isIssueComplete = false;
        let isPackingComplete = false;
        if (issueStageCompleted) {
            const current = await this.prisma.salesOrder.findUnique({
                where: {
                    id: orderId
                }
            });
            if (current && current.status !== 'W105' && current.status !== 'F105' && current.status !== 'Dispatched') {
                await this.prisma.salesOrder.update({
                    where: {
                        id: orderId
                    },
                    data: {
                        status: 'W105',
                        assignedUserId: null,
                        UpdatedBy: userName,
                        UpdatedDate: new Date()
                    }
                });
                await this.prisma.sO_Status_Stepper.updateMany({
                    where: {
                        salesOrderNumber: soNumber,
                        status: "Issued"
                    },
                    data: {
                        createdDateTime: new Date(),
                        updatedBy: userName
                    }
                });
                isIssueComplete = true;
            }
        }
        const packingStageCompleted = allMaterials.every((m)=>m.Packing_stage >= m.Required_Qty);
        if (packingStageCompleted) {
            await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    status: 'F105',
                    assignedUserId: null,
                    UpdatedBy: userName,
                    UpdatedDate: new Date()
                }
            });
            await this.prisma.sO_Status_Stepper.updateMany({
                where: {
                    salesOrderNumber: soNumber,
                    status: "Packed"
                },
                data: {
                    createdDateTime: new Date(),
                    updatedBy: userName
                }
            });
            isPackingComplete = true;
        }
        return {
            message: 'Group updated successfully',
            issueStageCompleted: isIssueComplete,
            packingStageCompleted: isPackingComplete
        };
    }
    async updatePackingStage(orderId, materialCode, newPackingStage, userId, userRole, materialId) {
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
        let material;
        if (materialId) {
            material = await this.prisma.eRP_Material_Data.findUnique({
                where: {
                    ID: materialId
                }
            });
        } else {
            material = await this.prisma.eRP_Material_Data.findFirst({
                where: {
                    Material_Code: materialCode,
                    saleOrderNumber: salesOrder.saleOrderNumber
                }
            });
        }
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
            const updatedOrder = await this.prisma.salesOrder.update({
                where: {
                    id: orderId
                },
                data: {
                    status: 'F105',
                    assignedUserId: null,
                    UpdatedBy: userName,
                    UpdatedDate: new Date()
                }
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
            packingStageCompleted
        });
    }
    async updateRemarks(orderId, materialId, remarks, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user ? user.name : 'System';
        const valueToSave = remarks && remarks.trim().length > 0 ? remarks : null;
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: {
                ID: materialId
            },
            data: {
                Remarks: valueToSave,
                UpdatedBy: userName,
                UpdatedDate: new Date()
            }
        });
        return convertBigInts({
            message: 'Remarks updated successfully',
            updatedMaterial
        });
    }
    async acceptAllIssueStage(orderId, userId, userRole) {
        if (userRole !== 'ADMIN') {
            throw new _common.ForbiddenException('Only Admins can perform this action');
        }
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
        const userName = await this.getUserName(userId);
        const now = new Date();
        const materials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: salesOrder.saleOrderNumber
            }
        });
        if (materials.length === 0) {
            throw new _common.NotFoundException('No materials found for this order');
        }
        await this.prisma.$transaction(async (tx)=>{
            for (const item of materials){
                if (item.Issue_stage < item.Required_Qty) {
                    await tx.eRP_Material_Data.update({
                        where: {
                            ID: item.ID
                        },
                        data: {
                            Issue_stage: item.Required_Qty,
                            UpdatedBy: userName,
                            UpdatedDate: now
                        }
                    });
                }
            }
        });
        return this._checkOrderCompletion(salesOrder.saleOrderNumber, orderId, userName);
    }
    async updateMapping(orderId, dto, userId, userRole) {
        await verifyOrderAccess(this.prisma, orderId, userId, userRole);
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user ? user.name : 'System';
        // 1. Fetch the current ERP Material record
        const currentMaterial = await this.prisma.eRP_Material_Data.findUnique({
            where: {
                ID: dto.materialId
            }
        });
        if (!currentMaterial) {
            throw new _common.NotFoundException('Material not found');
        }
        // --- NEW VALIDATION START ---
        // If we are adding/updating a Mapping Barcode, check for duplicates
        if (dto.mappingBarcode) {
            const barcodeToCheck = dto.mappingBarcode;
            // Check 1: Master Table (MaterialBarcode)
            // The new barcode should not match any existing Material Code (erpCode) or Mapping Barcode
            const existsInMaster = await this.prisma.materialBarcode.findFirst({
                where: {
                    OR: [
                        {
                            erpCode: {
                                equals: barcodeToCheck,
                                mode: 'insensitive'
                            }
                        },
                        {
                            mappingBarcode: {
                                equals: barcodeToCheck,
                                mode: 'insensitive'
                            }
                        }
                    ]
                }
            });
            if (existsInMaster) {
                throw new _common.BadRequestException(`The barcode '${barcodeToCheck}' already exists in the Master Data (MaterialBarcode).`);
            }
            // Check 2: Transaction Table (ERP_Material_Data) for the SAME Sales Order
            // The new barcode should not match any Material Code or Mapping Barcode in this SO
            // Exclude the current row (ID) we are updating
            const existsInCurrentSO = await this.prisma.eRP_Material_Data.findFirst({
                where: {
                    saleOrderNumber: currentMaterial.saleOrderNumber,
                    ID: {
                        not: dto.materialId
                    },
                    OR: [
                        {
                            Material_Code: {
                                equals: barcodeToCheck,
                                mode: 'insensitive'
                            }
                        },
                        {
                            Mapping_Barcode: {
                                equals: barcodeToCheck,
                                mode: 'insensitive'
                            }
                        }
                    ]
                }
            });
            if (existsInCurrentSO) {
                throw new _common.BadRequestException(`The barcode '${barcodeToCheck}' is already used as a Material Code or Mapping Barcode in this Sales Order.`);
            }
        }
        // --- NEW VALIDATION END ---
        // 2. Update ERP_Material_Data table (Both Mapping Barcode and Group are updated)
        const updatedMaterial = await this.prisma.eRP_Material_Data.update({
            where: {
                ID: dto.materialId
            },
            data: {
                Mapping_Barcode: dto.mappingBarcode || null,
                Group: dto.group || null,
                UpdatedBy: userName,
                UpdatedDate: new Date()
            }
        });
        // 3. Handle Master Table (MaterialBarcode) Logic
        const materialCode = currentMaterial.Material_Code;
        const existingMaster = await this.prisma.materialBarcode.findUnique({
            where: {
                erpCode: materialCode
            }
        });
        if (existingMaster) {
            // Case 1: Exists in Master - Update ONLY Mapping Barcode (ignore Group)
            await this.prisma.materialBarcode.update({
                where: {
                    id: existingMaster.id
                },
                data: {
                    mappingBarcode: dto.mappingBarcode || null
                }
            });
        } else {
            // Case 2: Does not exist in Master - Create new record with Mapping Barcode AND Group
            await this.prisma.materialBarcode.create({
                data: {
                    erpCode: materialCode,
                    mappingBarcode: dto.mappingBarcode || null,
                    group: dto.group || null,
                    acceptBulkData: false,
                    remarksRequired: false
                }
            });
        }
        return convertBigInts({
            message: 'Mapping details updated successfully',
            updatedMaterial
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