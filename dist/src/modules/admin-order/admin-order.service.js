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
        const { page = 1, limit = 20, search, date, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate, } = query;
        const parsedPage = Number(page) > 0 ? Number(page) : 1;
        const parsedLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;
        const allowedSortFields = [
            'createdAt',
            'priority',
            'status',
            'deliveryDate',
        ];
        const allowedSortOrders = ['asc', 'desc'];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const orderDirection = allowedSortOrders.includes(sortOrder)
            ? sortOrder
            : 'desc';
        const where = {};
        const parseYMDLocal = (s) => {
            const [y, m, d] = s.split('-').map(Number);
            return new Date(y, m - 1, d);
        };
        if (startDate || endDate) {
            const range = {};
            if (startDate) {
                const s = parseYMDLocal(startDate);
                s.setHours(0, 0, 0, 0);
                range.gte = s;
            }
            if (endDate) {
                const e = parseYMDLocal(endDate);
                const next = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1, 0, 0, 0, 0);
                range.lt = next;
            }
            where.deliveryDate = { ...where.deliveryDate, ...range };
        }
        if (search) {
            const lower = search.toLowerCase();
            const num = Number(search);
            where.OR = [
                { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
                { product: { is: { name: { contains: search, mode: 'insensitive' } } } },
                { transporter: { is: { name: { contains: search, mode: 'insensitive' } } } },
                { plantCode: { is: { code: { contains: search, mode: 'insensitive' } } } },
                { salesZone: { is: { name: { contains: search, mode: 'insensitive' } } } },
                { packConfig: { is: { configName: { contains: search, mode: 'insensitive' } } } },
                { assignedUser: { is: { name: { contains: search, mode: 'insensitive' } } } },
                { saleOrderNumber: { contains: search, mode: 'insensitive' } },
                { outboundDelivery: { contains: search, mode: 'insensitive' } },
                { transferOrder: { contains: search, mode: 'insensitive' } },
                { status: { contains: search, mode: 'insensitive' } },
                { specialRemarks: { contains: search, mode: 'insensitive' } },
                ...(lower === 'yes' || lower === 'no'
                    ? [{ paymentClearance: { equals: lower === 'yes' } }]
                    : []),
                ...(!isNaN(num) ? [{ priority: { equals: num } }] : []),
            ];
        }
        if (date) {
            const [y, m, d] = date.split('-').map(Number);
            const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
            const endUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000);
            where.deliveryDate = { gte: startUtc, lte: endUtc };
        }
        try {
            const total = await this.prisma.salesOrder.count({ where });
            if (total === 0) {
                return { total: 0, page: 1, limit: 0, data: [] };
            }
            const isFilterActive = !!search || !!startDate || !!endDate;
            const skip = isFilterActive ? 0 : (parsedPage - 1) * parsedLimit;
            const take = isFilterActive ? total : parsedLimit;
            const data = await this.prisma.salesOrder.findMany({
                where,
                orderBy: { [sortField]: orderDirection },
                skip,
                take,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    product: { select: { id: true, name: true, code: true } },
                    transporter: { select: { id: true, name: true } },
                    plantCode: { select: { id: true, code: true, description: true } },
                    salesZone: { select: { id: true, name: true } },
                    packConfig: { select: { id: true, configName: true } },
                    assignedUser: { select: { id: true, name: true } },
                    _count: {
                        select: { materialData: true },
                    },
                },
            });
            return {
                total,
                page: isFilterActive ? 1 : parsedPage,
                limit: isFilterActive ? total : parsedLimit,
                data: data.map(({ _count, ...order }) => ({
                    ...order,
                    hasMaterialData: _count.materialData > 0,
                })),
            };
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientValidationError) {
                throw new common_1.BadRequestException(err.message);
            }
            throw new common_1.BadRequestException('Failed to fetch sales orders.');
        }
    }
    async update(id, dto, user) {
        const order = await this.prisma.salesOrder.findUnique({ where: { id } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (user.role === 'USER' && order.assignedUserId !== user.userId) {
            throw new common_1.ForbiddenException('You can only update orders assigned to you.');
        }
        if (user.role === 'USER') {
            if (Object.keys(dto).length > 1 || !('fgLocation' in dto)) {
                throw new common_1.ForbiddenException('You are only allowed to update the FG Location.');
            }
        }
        return this.prisma.salesOrder.update({ where: { id }, data: dto });
    }
    async remove(id) {
        const order = await this.prisma.salesOrder.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { materialData: true },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Sales order not found');
        }
        if (order._count.materialData > 0) {
            throw new common_1.BadRequestException('Cannot delete an order that has material data imported.');
        }
        await this.prisma.salesOrder.delete({ where: { id } });
        return { message: 'Sales order deleted successfully' };
    }
};
exports.AdminOrderService = AdminOrderService;
exports.AdminOrderService = AdminOrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminOrderService);
//# sourceMappingURL=admin-order.service.js.map