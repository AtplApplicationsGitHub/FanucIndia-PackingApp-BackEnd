"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminOrderService", {
    enumerable: true,
    get: function() {
        return AdminOrderService;
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
let AdminOrderService = class AdminOrderService {
    async findAll(query, user) {
        const { page = 1, limit = 20, search, date, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate, paymentClearance, salesZoneId, statusFilter } = query;
        const parsedPage = Number(page) > 0 ? Number(page) : 1;
        const parsedLimit = Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 20;
        const allowedSortFields = [
            'createdAt',
            'priority',
            'status',
            'deliveryDate'
        ];
        const allowedSortOrders = [
            'asc',
            'desc'
        ];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const orderDirection = allowedSortOrders.includes(sortOrder) ? sortOrder : 'desc';
        const where = {};
        if (typeof paymentClearance === 'string' && paymentClearance !== '') {
            where.paymentClearance = paymentClearance === 'true';
        }
        if (typeof salesZoneId === 'string' && salesZoneId !== '') {
            const zoneIdNum = Number(salesZoneId);
            if (!Number.isNaN(zoneIdNum)) where.salesZoneId = zoneIdNum;
        }
        if (typeof statusFilter === 'string' && statusFilter !== '') {
            if (statusFilter === 'None') {
                where.AND = [
                    ...Array.isArray(where.AND) ? where.AND : [],
                    {
                        OR: [
                            {
                                status: null
                            },
                            {
                                status: ''
                            }
                        ]
                    }
                ];
            } else {
                where.status = statusFilter;
            }
        }
        const parseYMD = (s)=>{
            const [y, m, d] = s.split('-').map(Number);
            return {
                y,
                m,
                d
            };
        };
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        if (startDate || endDate) {
            const range = {};
            if (startDate) {
                const { y, m, d } = parseYMD(startDate);
                const s = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
                range.gte = s;
            }
            if (endDate) {
                const { y, m, d } = parseYMD(endDate);
                const e = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);
                range.lt = e;
            }
            where.deliveryDate = {
                ...where.deliveryDate,
                ...range
            };
        }
        if (search) {
            const lower = search.toLowerCase();
            const num = Number(search);
            where.OR = [
                {
                    customer: {
                        is: {
                            name: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    user: {
                        is: {
                            name: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    product: {
                        is: {
                            name: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    transporter: {
                        is: {
                            name: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    plantCode: {
                        is: {
                            code: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    salesZone: {
                        is: {
                            name: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    packConfig: {
                        is: {
                            configName: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    assignedUser: {
                        is: {
                            name: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    saleOrderNumber: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    outboundDelivery: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    transferOrder: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    status: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    specialRemarks: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                ...lower === 'yes' || lower === 'no' ? [
                    {
                        paymentClearance: {
                            equals: lower === 'yes'
                        }
                    }
                ] : [],
                ...!isNaN(num) ? [
                    {
                        priority: {
                            equals: num
                        }
                    }
                ] : []
            ];
        }
        if (date) {
            const [y, m, d] = date.split('-').map(Number);
            const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
            const endUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000);
            where.deliveryDate = {
                gte: startUtc,
                lte: endUtc
            };
        }
        try {
            const total = await this.prisma.salesOrder.count({
                where
            });
            if (total === 0) {
                return {
                    total: 0,
                    page: 1,
                    limit: 0,
                    data: []
                };
            }
            const isFilterActive = !!search || !!startDate || !!endDate;
            const skip = isFilterActive ? 0 : (parsedPage - 1) * parsedLimit;
            const take = isFilterActive ? total : parsedLimit;
            const data = await this.prisma.salesOrder.findMany({
                where,
                orderBy: {
                    [sortField]: orderDirection
                },
                skip,
                take,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    product: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    transporter: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    plantCode: {
                        select: {
                            id: true,
                            code: true,
                            description: true
                        }
                    },
                    salesZone: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    packConfig: {
                        select: {
                            id: true,
                            configName: true
                        }
                    },
                    assignedUser: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    _count: {
                        select: {
                            materialData: true,
                            soChatNotifications: {
                                where: {
                                    userId: user.userId
                                }
                            }
                        }
                    }
                }
            });
            return {
                total,
                page: isFilterActive ? 1 : parsedPage,
                limit: isFilterActive ? total : parsedLimit,
                data: data.map(({ _count, ...order })=>({
                        ...order,
                        hasMaterialData: _count.materialData > 0,
                        notificationCount: _count.soChatNotifications
                    }))
            };
        } catch (err) {
            if (err instanceof _client.Prisma.PrismaClientValidationError) {
                throw new _common.BadRequestException(err.message);
            }
            throw new _common.BadRequestException('Failed to fetch sales orders.');
        }
    }
    async update(id, dto, user) {
        const order = await this.prisma.salesOrder.findUnique({
            where: {
                id
            }
        });
        if (!order) {
            throw new _common.NotFoundException('Order not found');
        }
        if (user.role === 'USER' && order.assignedUserId !== user.userId) {
            throw new _common.ForbiddenException('You can only update orders assigned to you.');
        }
        if (user.role === 'USER') {
            if (Object.keys(dto).length > 1 || !('fgLocation' in dto)) {
                throw new _common.ForbiddenException('You are only allowed to update the FG Location.');
            }
        }
        let addressToSave = dto.address;
        if (addressToSave === undefined && dto.customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: {
                    id: dto.customerId
                }
            });
            if (customer) addressToSave = customer.address;
        }
        if (dto.deliveryDate && dto.deliveryDate.length === 10) {
            dto.deliveryDate = new Date(`${dto.deliveryDate}T00:00:00.000Z`).toISOString();
        }
        const data = {
            ...dto,
            UpdatedBy: user.name,
            UpdatedDate: new Date(),
            ...addressToSave !== undefined && {
                address: addressToSave
            }
        };
        if (dto.priority !== undefined && dto.priority !== null && order.status === null) {
            data.status = 'R105';
        }
        const now = new Date();
        if (dto.assignedUserId && order.assignedUserId !== dto.assignedUserId) {
            let targetStatus = '';
            if (order.status === 'R105' || !order.status) {
                targetStatus = 'Under Issue';
            } else if (order.status === 'W105') {
                targetStatus = 'Under Packing';
            }
            if (targetStatus) {
                await this.prisma.sO_Status_Stepper.updateMany({
                    where: {
                        salesOrderNumber: order.saleOrderNumber,
                        status: targetStatus,
                        createdDateTime: null
                    },
                    data: {
                        createdDateTime: now,
                        updatedBy: user.name
                    }
                });
            }
        }
        if (dto.fgLocation && order.fgLocation !== dto.fgLocation) {
            await this.prisma.sO_Status_Stepper.updateMany({
                where: {
                    salesOrderNumber: order.saleOrderNumber,
                    status: 'WIP Storage'
                },
                data: {
                    createdDateTime: now,
                    updatedBy: user.name
                }
            });
        }
        return this.prisma.salesOrder.update({
            where: {
                id
            },
            data
        });
    }
    async remove(id) {
        const order = await this.prisma.salesOrder.findUnique({
            where: {
                id
            },
            include: {
                _count: {
                    select: {
                        materialData: true
                    }
                }
            }
        });
        if (!order) {
            throw new _common.NotFoundException('Sales order not found');
        }
        if (order._count.materialData > 0) {
            throw new _common.BadRequestException('Cannot delete an order that has material data imported.');
        }
        await this.prisma.salesOrder.delete({
            where: {
                id
            }
        });
        return {
            message: 'Sales order deleted successfully'
        };
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
AdminOrderService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], AdminOrderService);

//# sourceMappingURL=admin-order.service.js.map