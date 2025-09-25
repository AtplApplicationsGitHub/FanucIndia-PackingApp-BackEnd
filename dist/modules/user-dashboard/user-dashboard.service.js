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
                Bin_No: true,
                A_D_F: true,
                Required_Qty: true,
                Issue_stage: true,
                Packing_stage: true
            }
        });
        return materialDetails;
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
UserDashboardService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], UserDashboardService);

//# sourceMappingURL=user-dashboard.service.js.map