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
exports.UserDashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let UserDashboardService = class UserDashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAssignedOrders(userId) {
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
        const incompleteOrders = assignedOrders.filter(order => {
            if (order.materialData.length === 0) {
                return true;
            }
            const isComplete = order.materialData.every(material => material.Required_Qty > 0 &&
                material.Required_Qty === material.Issue_stage &&
                material.Issue_stage === material.Packing_stage);
            return !isComplete;
        });
        return incompleteOrders.map(({ materialData, ...order }) => order);
    }
    async findOrderById(orderId, userId, userRole) {
        const whereClause = { id: orderId };
        if (userRole !== 'admin') {
            whereClause.assignedUserId = userId;
        }
        return this.prisma.salesOrder.findFirst({
            where: whereClause,
            include: {
                customer: true,
            },
        });
    }
};
exports.UserDashboardService = UserDashboardService;
exports.UserDashboardService = UserDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserDashboardService);
//# sourceMappingURL=user-dashboard.service.js.map