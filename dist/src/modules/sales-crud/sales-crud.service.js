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
exports.SalesCrudService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let SalesCrudService = class SalesCrudService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, userId) {
        try {
            const deliveryDate = dto.deliveryDate && dto.deliveryDate.length === 10
                ? new Date(dto.deliveryDate).toISOString()
                : dto.deliveryDate;
            const result = await this.prisma.salesOrder.create({
                data: {
                    ...dto,
                    deliveryDate,
                    userId,
                    status: "R105",
                    terminalId: null,
                    customerId: null,
                    printerId: null,
                },
            });
            return result;
        }
        catch (error) {
            throw error;
        }
    }
    async findAll(userId, query) {
        const results = await this.prisma.salesOrder.findMany({
            where: { userId },
            include: {
                product: true,
                transporter: true,
                plantCode: true,
                salesZone: true,
                packConfig: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        return results;
    }
    async findOne(id, userId) {
        const order = await this.prisma.salesOrder.findUnique({ where: { id } });
        if (!order || order.userId !== userId) {
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async update(id, dto, userId) {
        const order = await this.prisma.salesOrder.findUnique({ where: { id } });
        if (!order || order.userId !== userId) {
            throw new common_1.ForbiddenException('You can only update your own orders');
        }
        return this.prisma.salesOrder.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id, userId) {
        const order = await this.prisma.salesOrder.findUnique({ where: { id } });
        if (!order || order.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own orders');
        }
        return this.prisma.salesOrder.delete({ where: { id } });
    }
};
exports.SalesCrudService = SalesCrudService;
exports.SalesCrudService = SalesCrudService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesCrudService);
//# sourceMappingURL=sales-crud.service.js.map