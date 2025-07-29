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
            return await this.prisma.salesOrder.create({
                data: {
                    ...dto,
                    deliveryDate,
                    userId,
                    status: 'R105',
                    terminalId: null,
                    customerId: dto.customerId,
                    printerId: null,
                },
                include: { customer: true },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Failed to create sales order', error.message);
        }
    }
    async findAll(userId, query) {
        try {
            const { search } = query;
            const where = { userId };
            if (search) {
                where.OR = [
                    { saleOrderNumber: { contains: search } },
                    { outboundDelivery: { contains: search } },
                    { transferOrder: { contains: search } },
                    { status: { contains: search } },
                    { specialRemarks: { contains: search } },
                    ...(search.toLowerCase() === 'true' ||
                        search.toLowerCase() === 'false'
                        ? [{ paymentClearance: search.toLowerCase() === 'true' }]
                        : []),
                    {
                        customer: {
                            is: { name: { contains: search } },
                        },
                    },
                    {
                        product: {
                            is: { name: { contains: search } },
                        },
                    },
                    {
                        transporter: {
                            is: { name: { contains: search } },
                        },
                    },
                    {
                        plantCode: {
                            is: { code: { contains: search } },
                        },
                    },
                    {
                        salesZone: {
                            is: { name: { contains: search } },
                        },
                    },
                    {
                        packConfig: {
                            is: { configName: { contains: search } },
                        },
                    },
                ];
            }
            return await this.prisma.salesOrder.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                include: {
                    customer: true,
                    product: true,
                    transporter: true,
                    plantCode: true,
                    salesZone: true,
                    packConfig: true,
                },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Failed to fetch sales orders', error.message);
        }
    }
    async findOne(id, userId) {
        const order = await this.prisma.salesOrder.findUnique({
            where: { id },
            include: {
                customer: true,
                product: true,
                transporter: true,
                plantCode: true,
                salesZone: true,
                packConfig: true,
            },
        });
        if (!order || order.userId !== userId) {
            throw new common_1.NotFoundException('Sales order not found or access denied');
        }
        return order;
    }
    async update(id, dto, userId) {
        const existing = await this.prisma.salesOrder.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Sales order not found');
        }
        if (existing.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to update this order');
        }
        try {
            const deliveryDate = dto.deliveryDate && dto.deliveryDate.length === 10
                ? new Date(dto.deliveryDate).toISOString()
                : dto.deliveryDate;
            return await this.prisma.salesOrder.update({
                where: { id },
                data: { ...dto, deliveryDate },
                include: {
                    customer: true,
                    product: true,
                    transporter: true,
                    plantCode: true,
                    salesZone: true,
                    packConfig: true,
                },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Failed to update sales order', error.message);
        }
    }
    async remove(id, userId) {
        const existing = await this.prisma.salesOrder.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Sales order not found');
        }
        if (existing.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this order');
        }
        try {
            return await this.prisma.salesOrder.delete({
                where: { id },
            });
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Failed to delete sales order', error.message);
        }
    }
    async getPaginatedOrders(page, limit, userId, search) {
        const skip = (page - 1) * limit;
        const whereClause = { userId };
        if (search) {
            const s = { contains: search };
            whereClause.OR = [
                { saleOrderNumber: s },
                { outboundDelivery: s },
                { transferOrder: s },
                { status: s },
                { specialRemarks: s },
                ...(['true', 'false'].includes(search.toLowerCase())
                    ? [{ paymentClearance: search.toLowerCase() === 'true' }]
                    : []),
                { customer: { is: { name: s } } },
                { product: { is: { name: s } } },
                { transporter: { is: { name: s } } },
                { plantCode: { is: { code: s } } },
                { salesZone: { is: { name: s } } },
                { packConfig: { is: { configName: s } } },
            ];
        }
        const [orders, totalCount] = await this.prisma.$transaction([
            this.prisma.salesOrder.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' },
                include: {
                    customer: true,
                    product: true,
                    transporter: true,
                    plantCode: true,
                    salesZone: true,
                    packConfig: true,
                },
            }),
            this.prisma.salesOrder.count({ where: whereClause }),
        ]);
        return {
            orders,
            totalCount,
        };
    }
};
exports.SalesCrudService = SalesCrudService;
exports.SalesCrudService = SalesCrudService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesCrudService);
//# sourceMappingURL=sales-crud.service.js.map