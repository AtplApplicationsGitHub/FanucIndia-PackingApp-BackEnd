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
const client_1 = require("@prisma/client");
let SalesCrudService = class SalesCrudService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, userId) {
        const existingOrder = await this.prisma.salesOrder.findFirst({
            where: {
                OR: [
                    { saleOrderNumber: dto.saleOrderNumber },
                    { outboundDelivery: dto.outboundDelivery },
                    { transferOrder: dto.transferOrder },
                ],
            },
        });
        if (existingOrder) {
            if (existingOrder.saleOrderNumber === dto.saleOrderNumber) {
                throw new common_1.ConflictException('An order with this Sale Order Number already exists.');
            }
            if (existingOrder.outboundDelivery === dto.outboundDelivery) {
                throw new common_1.ConflictException('An order with this Outbound Delivery number already exists.');
            }
            if (existingOrder.transferOrder === dto.transferOrder) {
                throw new common_1.ConflictException('An order with this Transfer Order number already exists.');
            }
        }
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
                    assignedUserId: null,
                    customerId: dto.customerId,
                    printerId: null,
                },
                include: { customer: true },
            });
        }
        catch (err) {
            throw new common_1.InternalServerErrorException('Failed to create sales order.', err.message);
        }
    }
    async findAll(userId, query) {
        try {
            const { search } = query;
            const where = { userId };
            if (search) {
                const s = { contains: search, mode: 'insensitive' };
                where.OR = [
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
            return await this.prisma.salesOrder.findMany({
                where,
                orderBy: { createdAt: 'desc' },
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
        catch (err) {
            throw new common_1.InternalServerErrorException('Failed to fetch sales orders.', err.message);
        }
    }
    async findOne(id, userId) {
        try {
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
                throw new common_1.NotFoundException('Sales order not found or access denied.');
            }
            return order;
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException)
                throw err;
            throw new common_1.InternalServerErrorException('Failed to retrieve sales order.', err.message);
        }
    }
    async update(id, dto, userId) {
        const existing = await this.prisma.salesOrder.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new common_1.NotFoundException('Sales order not found or access denied.');
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
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2025') {
                    throw new common_1.NotFoundException('Sales order not found.');
                }
                if (err.code === 'P2002') {
                    throw new common_1.ConflictException('Update would violate a unique constraint.');
                }
            }
            throw new common_1.InternalServerErrorException('Failed to update sales order.', err.message);
        }
    }
    async remove(id, userId) {
        const existing = await this.prisma.salesOrder.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new common_1.NotFoundException('Sales order not found or access denied.');
        }
        try {
            await this.prisma.salesOrder.delete({ where: { id } });
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
                throw new common_1.NotFoundException('Sales order not found.');
            }
            throw new common_1.InternalServerErrorException('Failed to delete sales order.', err.message);
        }
    }
    async getPaginatedOrders(page, limit, userId, search) {
        try {
            const skip = (page - 1) * limit;
            const whereClause = { userId };
            if (search) {
                const s = { contains: search, mode: 'insensitive' };
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
                    orderBy: { createdAt: 'desc' },
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
            return { orders, totalCount };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException('Failed to fetch paginated sales orders.', err.message);
        }
    }
};
exports.SalesCrudService = SalesCrudService;
exports.SalesCrudService = SalesCrudService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SalesCrudService);
//# sourceMappingURL=sales-crud.service.js.map