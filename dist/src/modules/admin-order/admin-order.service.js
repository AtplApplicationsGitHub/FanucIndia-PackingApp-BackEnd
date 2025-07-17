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
exports.AdminOrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const client_1 = require("@prisma/client");
let AdminOrderService = class AdminOrderService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page = 1, limit = 20, product, date, sortBy = 'createdAt', sortOrder = 'asc', } = query;
        const parsedPage = Number(page) > 0 ? Number(page) : 1;
        const parsedLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;
        const allowedSortFields = ['createdAt', 'priority', 'status', 'deliveryDate'];
        const allowedSortOrders = ['asc', 'desc'];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const orderDirection = allowedSortOrders.includes(sortOrder) ? sortOrder : 'asc';
        const where = {};
        if (product) {
            where.product = {
                is: {
                    name: {
                        contains: product,
                    },
                },
            };
        }
        if (date) {
            const start = new Date(`${date}T00:00:00`);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            where.deliveryDate = { gte: start, lt: end };
        }
        try {
            const total = await this.prisma.salesOrder.count({ where });
            if (total === 0) {
                return { total: 0, page: 1, limit: 0, data: [] };
            }
            const isFilterActive = !!product || !!date;
            const skip = isFilterActive ? 0 : (parsedPage - 1) * parsedLimit;
            const take = isFilterActive ? total : parsedLimit;
            const data = await this.prisma.salesOrder.findMany({
                where,
                orderBy: { [sortField]: orderDirection },
                skip,
                take,
                include: {
                    user: { select: { id: true, email: true } },
                    product: { select: { id: true, name: true, code: true } },
                    transporter: { select: { id: true, name: true } },
                    plantCode: { select: { id: true, code: true, description: true } },
                    salesZone: { select: { id: true, name: true } },
                    packConfig: { select: { id: true, configName: true } },
                    terminal: { select: { id: true, name: true } },
                },
            });
            return {
                total,
                page: isFilterActive ? 1 : parsedPage,
                limit: isFilterActive ? total : parsedLimit,
                data,
            };
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientValidationError) {
                throw new common_1.BadRequestException(err.message);
            }
            throw new common_1.BadRequestException('Failed to fetch sales orders.');
        }
    }
    async update(id, dto) {
        const order = await this.prisma.salesOrder.findUnique({ where: { id } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return this.prisma.salesOrder.update({
            where: { id },
            data: dto,
        });
    }
};
exports.AdminOrderService = AdminOrderService;
exports.AdminOrderService = AdminOrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminOrderService);
//# sourceMappingURL=admin-order.service.js.map