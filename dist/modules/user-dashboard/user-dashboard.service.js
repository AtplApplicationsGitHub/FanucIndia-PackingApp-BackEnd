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
                assignedUserId: userId
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
                return true;
            }
            const isComplete = order.materialData.every((material)=>material.Required_Qty > 0 && material.Required_Qty === material.Issue_stage && material.Issue_stage === material.Packing_stage);
            return !isComplete;
        });
        return incompleteOrders.map(({ materialData, ...order })=>order);
    }
    async findOrderById(orderId, userId, userRole) {
        const whereClause = {
            id: orderId
        };
        if (userRole !== 'ADMIN') {
            whereClause.assignedUserId = userId;
        }
        return this.prisma.salesOrder.findFirst({
            where: whereClause,
            include: {
                customer: true
            }
        });
    }
    async getAssignedOrdersSummary(userId) {
        const assignedOrders = await this.prisma.salesOrder.findMany({
            where: {
                assignedUserId: userId
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
    async downloadOrderDetails(orderId, userId, userRole) {
        const order = await this.findOrderById(orderId, userId, userRole);
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        const materialDetails = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: order.saleOrderNumber
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
                Packing_stage: true
            }
        });
        return materialDetails;
    }
    async downloadOrderDetailsBySoNumber(saleOrderNumber, userId, userRole) {
        const order = await this.prisma.salesOrder.findUnique({
            where: {
                saleOrderNumber
            }
        });
        if (!order) {
            throw new _common.NotFoundException('Sales Order not found.');
        }
        if (userRole === 'USER' && order.assignedUserId !== userId) {
            throw new _common.ForbiddenException('You are not authorized to view this order.');
        }
        const materialDetails = await this.prisma.eRP_Material_Data.findMany({
            where: {
                saleOrderNumber: order.saleOrderNumber
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
                Packing_stage: true
            }
        });
        return materialDetails;
    }
    async uploadOrderDetails(orderId, userId, userRole, data, attachments = []) {
        const order = await this.findOrderById(orderId, userId, userRole);
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        return this.processUpload(order.saleOrderNumber, data, attachments);
    }
    async uploadOrderDetailsBySoNumber(saleOrderNumber, userId, userRole, data, attachments = []) {
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
        return this.processUpload(saleOrderNumber, data, attachments);
    }
    async processUpload(saleOrderNumber, data, attachments) {
        const { materials } = data;
        if (!materials || materials.length === 0) {
            throw new _common.BadRequestException('No materials data provided.');
        }
        try {
            await this.prisma.$transaction(async (tx)=>{
                for (const material of materials){
                    await tx.eRP_Material_Data.updateMany({
                        where: {
                            saleOrderNumber: saleOrderNumber,
                            Material_Code: material.Material_Code
                        },
                        data: {
                            Issue_stage: material.Issue_stage,
                            Packing_stage: material.Packing_stage,
                            UpdatedBy: 'MOBILE_SYNC',
                            UpdatedDate: new Date()
                        }
                    });
                }
                if (attachments.length > 0) {
                    const remoteDir = _path.posix.join(process.env.SFTP_BASE_DIR || '/fanuc/order-attachments', saleOrderNumber);
                    await this.sftpService.ensureDir(remoteDir);
                    for (const file of attachments){
                        const remotePath = _path.posix.join(remoteDir, file.filename);
                        await this.sftpService.put(file.path, remotePath);
                        await tx.eRP_Material_File.create({
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
                }
            });
            return {
                message: 'Data and attachments uploaded and synchronized successfully.'
            };
        } catch (error) {
            console.error('ERROR during upload process:', error);
            throw new _common.BadRequestException('Failed to update material data or upload attachments.');
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