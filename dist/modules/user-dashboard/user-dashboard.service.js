"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserDashboardService", {
    enumerable: true,
    get: function() {
        return UserDashboardService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _sftpservice = require("../sftp/sftp.service");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let UserDashboardService = class UserDashboardService {
    async findAssignedOrders(userId) {
        const assignedOrders = await this.prisma.salesOrder.findMany({
            where: {
                assignedUserId: userId,
                materialData: {
                    some: {}
                }
            },
            include: {
                product: {
                    select: {
                        name: true
                    }
                },
                packConfig: {
                    select: {
                        configName: true
                    }
                },
                materialData: {
                    select: {
                        Required_Qty: true,
                        Issue_stage: true,
                        Packing_stage: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const incompleteOrders = assignedOrders.filter((order)=>{
            if (order.materialData.length === 0) {
                return false;
            }
            const isComplete = order.materialData.every((material)=>material.Required_Qty > 0 && material.Required_Qty === material.Issue_stage && material.Issue_stage === material.Packing_stage);
            return !isComplete;
        });
        return incompleteOrders.map(({ materialData, ...order })=>order);
    }
    async getAssignedOrdersSummary(userId) {
        const assignedOrders = await this.prisma.salesOrder.findMany({
            where: {
                assignedUserId: userId,
                materialData: {
                    some: {}
                }
            },
            select: {
                saleOrderNumber: true,
                priority: true,
                status: true,
                materialData: {
                    select: {
                        Required_Qty: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return assignedOrders.map((order)=>{
            const totalMaterials = order.materialData.length;
            const totalItems = order.materialData.reduce((sum, material)=>sum + material.Required_Qty, 0);
            return {
                saleOrderNumber: order.saleOrderNumber,
                priority: order.priority,
                status: order.status,
                totalMaterials,
                totalItems
            };
        });
    }
    async findOrderById(orderId, userId, userRole) {
        const whereClause = {
            id: orderId
        };
        if (userRole !== 'ADMIN') {
            whereClause.assignedUserId = userId;
        }
        const order = await this.prisma.salesOrder.findFirst({
            where: whereClause,
            include: {
                customer: true
            }
        });
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        return order;
    }
    async downloadOrderDetails(orderId, userId, userRole) {
        const order = await this.findOrderById(orderId, userId, userRole);
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        return this.getMaterialDetails(order.saleOrderNumber);
    }
    async downloadOrderDetailsBySoNumber(saleOrderNumber, userId, userRole) {
        await this.authorizeOrderAccess(saleOrderNumber, userId, userRole);
        return this.getMaterialDetails(saleOrderNumber);
    }
    async getMaterialDetails(saleOrderNumber) {
        const materials = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber
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
                UpdatedDate: true
            }
        });
        return materials.map((material)=>({
                ...material,
                ID: material.ID.toString()
            }));
    }
    async syncOrderById(orderId, user, data, attachments) {
        const order = await this.findOrderById(orderId, user.userId, user.role);
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        return this.processCombinedUpload(order.saleOrderNumber, data, attachments, user.name);
    }
    async syncOrderBySoNumber(saleOrderNumber, user, data, attachments) {
        await this.authorizeOrderAccess(saleOrderNumber, user.userId, user.role);
        return this.processCombinedUpload(saleOrderNumber, data, attachments, user.name);
    }
    async updateDataById(orderId, user, data) {
        const order = await this.findOrderById(orderId, user.userId, user.role);
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        return this.processDataUpdate(order.saleOrderNumber, data, user.name);
    }
    async updateDataBySoNumber(saleOrderNumber, user, data) {
        await this.authorizeOrderAccess(saleOrderNumber, user.userId, user.role);
        return this.processDataUpdate(saleOrderNumber, data, user.name);
    }
    async uploadAttachmentsById(orderId, user, attachments) {
        const order = await this.findOrderById(orderId, user.userId, user.role);
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        return this.processAttachmentsUpload(order.saleOrderNumber, attachments);
    }
    async uploadAttachmentsBySoNumber(saleOrderNumber, user, attachments) {
        await this.authorizeOrderAccess(saleOrderNumber, user.userId, user.role);
        return this.processAttachmentsUpload(saleOrderNumber, attachments);
    }
    async processCombinedUpload(saleOrderNumber, data, attachments, userName) {
        try {
            await this.prisma.$transaction(async (tx)=>{
                await this.processDataUpdate(saleOrderNumber, data, userName, tx);
                await this.processAttachmentsUpload(saleOrderNumber, attachments, tx);
            });
            return {
                message: 'Data and attachments synchronized successfully.'
            };
        } catch (error) {
            console.error('ERROR during combined sync:', error);
            throw new _common.BadRequestException('Failed to synchronize data and attachments.');
        }
    }
    async processDataUpdate(saleOrderNumber, data, userName, tx) {
        const prismaClient = tx || this.prisma;
        const { materials } = data;
        if (!materials || materials.length === 0) {
            throw new _common.BadRequestException('No materials data provided.');
        }
        for (const material of materials){
            await prismaClient.eRP_Material_Data.updateMany({
                where: {
                    saleOrderNumber: saleOrderNumber,
                    Material_Code: material.Material_Code
                },
                data: {
                    Issue_stage: material.Issue_stage,
                    Packing_stage: material.Packing_stage,
                    UpdatedBy: userName,
                    // Use the provided timestamp if it exists, otherwise use the sync time
                    UpdatedDate: material.UpdatedDate ? new Date(material.UpdatedDate) : new Date()
                }
            });
        }
        await this._checkAndUpdateOrderStatus(saleOrderNumber, prismaClient, userName);
        return {
            message: 'Data updated successfully.'
        };
    }
    async processAttachmentsUpload(saleOrderNumber, attachments, tx) {
        const prismaClient = tx || this.prisma;
        if (!attachments || attachments.length === 0) {
            // Allow data-only updates
            return;
        }
        const remoteDir = _path.posix.join(process.env.SFTP_BASE_DIR_ORDER || '', saleOrderNumber);
        await this.sftpService.ensureDir(remoteDir);
        for (const file of attachments){
            const remotePath = _path.posix.join(remoteDir, file.originalname);
            await this.sftpService.put(file.path, remotePath);
            await prismaClient.eRP_Material_File.create({
                data: {
                    saleOrderNumber: saleOrderNumber,
                    fileName: file.originalname,
                    sftpPath: remotePath,
                    sftpDir: remoteDir,
                    fileSizeBytes: BigInt(file.size),
                    mimeType: file.mimetype
                }
            });
            _fs.unlinkSync(file.path);
        }
        return {
            message: 'Attachments uploaded successfully.'
        };
    }
    async authorizeOrderAccess(saleOrderNumber, userId, userRole) {
        const order = await this.prisma.salesOrder.findUnique({
            where: {
                saleOrderNumber
            }
        });
        if (!order) {
            throw new _common.NotFoundException('Sales Order not found.');
        }
        if (userRole === 'USER' && order.assignedUserId !== userId) {
            throw new _common.ForbiddenException('You are not authorized to modify this order.');
        }
    }
    async _checkAndUpdateOrderStatus(saleOrderNumber, prismaClient, userName) {
        const order = await prismaClient.salesOrder.findUnique({
            where: {
                saleOrderNumber
            },
            select: {
                id: true,
                status: true
            }
        });
        if (!order) return;
        const allMaterials = await prismaClient.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: saleOrderNumber
            },
            select: {
                Issue_stage: true,
                Packing_stage: true,
                Required_Qty: true
            }
        });
        if (allMaterials.length === 0) return;
        const issueStageCompleted = allMaterials.every((m)=>m.Required_Qty > 0 && m.Issue_stage >= m.Required_Qty);
        if (issueStageCompleted && order.status !== 'W105' && order.status !== 'F105') {
            await prismaClient.salesOrder.update({
                where: {
                    id: order.id
                },
                data: {
                    status: 'W105',
                    assignedUserId: null
                }
            });
            await prismaClient.sO_Status_Stepper.updateMany({
                where: {
                    salesOrderNumber: saleOrderNumber,
                    status: 'Issued'
                },
                data: {
                    createdDateTime: new Date(),
                    updatedBy: userName
                }
            });
        }
        const packingStageCompleted = allMaterials.every((m)=>m.Required_Qty > 0 && m.Packing_stage >= m.Required_Qty);
        if (packingStageCompleted) {
            await prismaClient.salesOrder.update({
                where: {
                    id: order.id
                },
                data: {
                    status: 'F105',
                    assignedUserId: null
                }
            });
            await prismaClient.sO_Status_Stepper.updateMany({
                where: {
                    salesOrderNumber: saleOrderNumber,
                    status: 'Packed'
                },
                data: {
                    createdDateTime: new Date(),
                    updatedBy: userName
                }
            });
        }
    }
    constructor(prisma, sftpService){
        this.prisma = prisma;
        this.sftpService = sftpService;
    }
};
UserDashboardService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _sftpservice.SftpService === "undefined" ? Object : _sftpservice.SftpService
    ])
], UserDashboardService);

//# sourceMappingURL=user-dashboard.service.js.map