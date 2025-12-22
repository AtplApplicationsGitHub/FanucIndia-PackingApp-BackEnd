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
            const customer = await this.prisma.customer.findUnique({
                where: {
                    id: dto.customerId
                }
            });
            const address = customer?.address || null;
            const deliveryDate = dto.deliveryDate && dto.deliveryDate.length === 10 ? new Date(`${dto.deliveryDate}T00:00:00.000Z`).toISOString() : dto.deliveryDate;
            const newOrder = await this.prisma.salesOrder.create({
                data: {
                    ...dto,
                    deliveryDate,
                    userId,
                    assignedUserId: null,
                    customerId: dto.customerId,
                    printerId: null,
                    address: address
                },
                include: {
                    customer: true
                }
            });
            const statuses = [
                "To be Issued",
                "Under Issue",
                "Issued",
                "Under Packing",
                "Packed",
                "WIP Storage",
                "Ready for Dispatch",
                "Dispatched"
            ];
            await this.prisma.sO_Status_Stepper.createMany({
                data: statuses.map((status)=>({
                        salesOrderNumber: newOrder.saleOrderNumber,
                        status: status,
                        createdDateTime: status === 'To be Issued' ? newOrder.createdAt : null,
                        updatedBy: null
                    }))
            });
            return newOrder;
        } catch (err) {
            throw new _common.InternalServerErrorException('Failed to create sales order.', err.message);
        }
    }
    async verifySoNumber(soNumber) {
        try {
            const order = await this.prisma.salesOrder.findFirst({
                where: {
                    saleOrderNumber: {
                        equals: soNumber,
                        mode: 'insensitive'
                    }
                },
                select: {
                    saleOrderNumber: true,
                    address: true,
                    customer: {
                        select: {
                            name: true
                        }
                    }
                }
            });
            if (!order) {
                throw new _common.NotFoundException('Invalid SO Number');
            }
            return {
                valid: true,
                saleOrderNumber: order.saleOrderNumber,
                customerName: order.customer?.name || '',
                address: order.address || ''
            };
        } catch (err) {
            if (err instanceof _common.NotFoundException) {
                throw err;
            }
            throw new _common.InternalServerErrorException('Failed to verify sales order.', err.message);
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
            let address;
            if (dto.customerId) {
                const customer = await this.prisma.customer.findUnique({
                    where: {
                        id: dto.customerId
                    }
                });
                if (customer) address = customer.address;
            }
            const deliveryDate = dto.deliveryDate && dto.deliveryDate.length === 10 ? new Date(`${dto.deliveryDate}T00:00:00.000Z`).toISOString() : dto.deliveryDate;
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                }
            });
            return await this.prisma.salesOrder.update({
                where: {
                    id
                },
                data: {
                    ...dto,
                    ...deliveryDate ? {
                        deliveryDate
                    } : {},
                    UpdatedBy: user?.name || 'System',
                    UpdatedDate: new Date(),
                    ...address !== undefined && {
                        address
                    }
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
                        assignedUser: true,
                        _count: {
                            select: {
                                materialData: true
                            }
                        }
                    }
                }),
                this.prisma.salesOrder.count({
                    where: whereClause
                })
            ]);
            const mappedOrders = orders.map((order)=>({
                    ...order,
                    hasMaterialData: order._count.materialData > 0
                }));
            return {
                orders: mappedOrders,
                totalCount
            };
        } catch (err) {
            throw new _common.InternalServerErrorException('Failed to fetch paginated sales orders.', err.message);
        }
    }
    async processLabelPrint(dto, userId) {
        const { saleOrderNumbers } = dto;
        const statusToSet = 'Ready for Dispatch';
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user?.name || 'System';
        const now = new Date();
        try {
            await this.prisma.$transaction(async (tx)=>{
                await tx.salesOrder.updateMany({
                    where: {
                        saleOrderNumber: {
                            in: saleOrderNumbers
                        },
                        status: {
                            not: 'Dispatched'
                        }
                    },
                    data: {
                        UpdatedBy: userName,
                        UpdatedDate: now
                    }
                });
                await tx.sO_Status_Stepper.updateMany({
                    where: {
                        salesOrderNumber: {
                            in: saleOrderNumbers
                        },
                        status: statusToSet
                    },
                    data: {
                        createdDateTime: now,
                        updatedBy: userName
                    }
                });
            });
            return {
                message: 'Labels printed and status updated to Ready for Dispatch.',
                count: saleOrderNumbers.length
            };
        } catch (err) {
            throw new _common.InternalServerErrorException('Failed to update order status for label print.', err.message);
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