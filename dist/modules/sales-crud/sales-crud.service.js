"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesCrudService", {
    enumerable: true,
    get: function() {
        return SalesCrudService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _client = require("@prisma/client");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SalesCrudService = class SalesCrudService {
    async create(dto, userId) {
        const existingOrder = await this.prisma.salesOrder.findFirst({
            where: {
                OR: [
                    {
                        saleOrderNumber: dto.saleOrderNumber
                    },
                    {
                        outboundDelivery: dto.outboundDelivery
                    },
                    {
                        transferOrder: dto.transferOrder
                    }
                ]
            }
        });
        if (existingOrder) {
            if (existingOrder.saleOrderNumber === dto.saleOrderNumber) {
                throw new _common.ConflictException('An order with this Sale Order Number already exists.');
            }
            if (existingOrder.outboundDelivery === dto.outboundDelivery) {
                throw new _common.ConflictException('An order with this Outbound Delivery number already exists.');
            }
            if (existingOrder.transferOrder === dto.transferOrder) {
                throw new _common.ConflictException('An order with this Transfer Order number already exists.');
            }
        }
        try {
            const deliveryDate = dto.deliveryDate && dto.deliveryDate.length === 10 ? new Date(dto.deliveryDate).toISOString() : dto.deliveryDate;
            return await this.prisma.salesOrder.create({
                data: {
                    ...dto,
                    deliveryDate,
                    userId,
                    status: 'R105',
                    assignedUserId: null,
                    customerId: dto.customerId,
                    printerId: null
                },
                include: {
                    customer: true
                }
            });
        } catch (err) {
            throw new _common.InternalServerErrorException('Failed to create sales order.', err.message);
        }
    }
    async findAll(userId, query) {
        try {
            const { search } = query;
            const where = {
                userId
            };
            if (search) {
                const s = {
                    contains: search,
                    mode: 'insensitive'
                };
                where.OR = [
                    {
                        saleOrderNumber: s
                    },
                    {
                        outboundDelivery: s
                    },
                    {
                        transferOrder: s
                    },
                    {
                        status: s
                    },
                    {
                        specialRemarks: s
                    },
                    ...[
                        'true',
                        'false'
                    ].includes(search.toLowerCase()) ? [
                        {
                            paymentClearance: search.toLowerCase() === 'true'
                        }
                    ] : [],
                    {
                        customer: {
                            is: {
                                name: s
                            }
                        }
                    },
                    {
                        product: {
                            is: {
                                name: s
                            }
                        }
                    },
                    {
                        transporter: {
                            is: {
                                name: s
                            }
                        }
                    },
                    {
                        plantCode: {
                            is: {
                                code: s
                            }
                        }
                    },
                    {
                        salesZone: {
                            is: {
                                name: s
                            }
                        }
                    },
                    {
                        packConfig: {
                            is: {
                                configName: s
                            }
                        }
                    }
                ];
            }
            return await this.prisma.salesOrder.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    customer: true,
                    product: true,
                    transporter: true,
                    plantCode: true,
                    salesZone: true,
                    packConfig: true
                }
            });
        } catch (err) {
            throw new _common.InternalServerErrorException('Failed to fetch sales orders.', err.message);
        }
    }
    async findOne(id, userId) {
        try {
            const order = await this.prisma.salesOrder.findUnique({
                where: {
                    id
                },
                include: {
                    customer: true,
                    product: true,
                    transporter: true,
                    plantCode: true,
                    salesZone: true,
                    packConfig: true
                }
            });
            if (!order || order.userId !== userId) {
                throw new _common.NotFoundException('Sales order not found or access denied.');
            }
            return order;
        } catch (err) {
            if (err instanceof _common.NotFoundException) throw err;
            throw new _common.InternalServerErrorException('Failed to retrieve sales order.', err.message);
        }
    }
    async update(id, dto, userId) {
        const existing = await this.prisma.salesOrder.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!existing) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        try {
            const deliveryDate = dto.deliveryDate && dto.deliveryDate.length === 10 ? new Date(dto.deliveryDate).toISOString() : dto.deliveryDate;
            return await this.prisma.salesOrder.update({
                where: {
                    id
                },
                data: {
                    ...dto,
                    deliveryDate
                },
                include: {
                    customer: true,
                    product: true,
                    transporter: true,
                    plantCode: true,
                    salesZone: true,
                    packConfig: true
                }
            });
        } catch (err) {
            if (err instanceof _client.Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2025') {
                    throw new _common.NotFoundException('Sales order not found.');
                }
                if (err.code === 'P2002') {
                    throw new _common.ConflictException('Update would violate a unique constraint.');
                }
            }
            throw new _common.InternalServerErrorException('Failed to update sales order.', err.message);
        }
    }
    async remove(id, userId) {
        const existing = await this.prisma.salesOrder.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!existing) {
            throw new _common.NotFoundException('Sales order not found or access denied.');
        }
        try {
            await this.prisma.salesOrder.delete({
                where: {
                    id
                }
            });
        } catch (err) {
            if (err instanceof _client.Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
                throw new _common.NotFoundException('Sales order not found.');
            }
            throw new _common.InternalServerErrorException('Failed to delete sales order.', err.message);
        }
    }
    async getPaginatedOrders(page, limit, userId, search) {
        try {
            const skip = (page - 1) * limit;
            const whereClause = {
                userId
            };
            if (search) {
                const s = {
                    contains: search,
                    mode: 'insensitive'
                };
                whereClause.OR = [
                    {
                        saleOrderNumber: s
                    },
                    {
                        outboundDelivery: s
                    },
                    {
                        transferOrder: s
                    },
                    {
                        status: s
                    },
                    {
                        specialRemarks: s
                    },
                    ...[
                        'true',
                        'false'
                    ].includes(search.toLowerCase()) ? [
                        {
                            paymentClearance: search.toLowerCase() === 'true'
                        }
                    ] : [],
                    {
                        customer: {
                            is: {
                                name: s
                            }
                        }
                    },
                    {
                        product: {
                            is: {
                                name: s
                            }
                        }
                    },
                    {
                        transporter: {
                            is: {
                                name: s
                            }
                        }
                    },
                    {
                        plantCode: {
                            is: {
                                code: s
                            }
                        }
                    },
                    {
                        salesZone: {
                            is: {
                                name: s
                            }
                        }
                    },
                    {
                        packConfig: {
                            is: {
                                configName: s
                            }
                        }
                    }
                ];
            }
            const [orders, totalCount] = await this.prisma.$transaction([
                this.prisma.salesOrder.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        customer: true,
                        product: true,
                        transporter: true,
                        plantCode: true,
                        salesZone: true,
                        packConfig: true,
                        assignedUser: true
                    }
                }),
                this.prisma.salesOrder.count({
                    where: whereClause
                })
            ]);
            return {
                orders,
                totalCount
            };
        } catch (err) {
            throw new _common.InternalServerErrorException('Failed to fetch paginated sales orders.', err.message);
        }
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
SalesCrudService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], SalesCrudService);

//# sourceMappingURL=sales-crud.service.js.map