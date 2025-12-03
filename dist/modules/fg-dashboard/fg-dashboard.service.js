"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FgDashboardService", {
    enumerable: true,
    get: function() {
        return FgDashboardService;
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
let FgDashboardService = class FgDashboardService {
    async getFgDashboardData(user, query) {
        const { search, date, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (date) {
            const parseYMD = (s)=>{
                const [y, m, d] = s.split('-').map(Number);
                return {
                    y,
                    m,
                    d
                };
            };
            const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
            const { y, m, d } = parseYMD(date);
            const startIST = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
            const endISTExclusive = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - IST_OFFSET_MS);
            where.deliveryDate = {
                gte: startIST,
                lt: endISTExclusive
            };
        }
        if (search) {
            const lowerSearch = search.toLowerCase();
            let paymentBoolean = undefined;
            if (lowerSearch === 'yes') {
                paymentBoolean = true;
            } else if (lowerSearch === 'no') {
                paymentBoolean = false;
            }
            where.OR = [
                {
                    saleOrderNumber: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    product: {
                        name: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    customer: {
                        name: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    status: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    fgLocation: {
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
                {
                    UpdatedBy: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                ...paymentBoolean !== undefined ? [
                    {
                        paymentClearance: {
                            equals: paymentBoolean
                        }
                    }
                ] : []
            ];
        }
        const [salesOrders, totalCount] = await this.prisma.$transaction([
            this.prisma.salesOrder.findMany({
                where,
                select: {
                    id: true,
                    deliveryDate: true,
                    saleOrderNumber: true,
                    transferOrder: true,
                    paymentClearance: true,
                    status: true,
                    fgLocation: true,
                    specialRemarks: true,
                    UpdatedBy: true,
                    UpdatedDate: true,
                    assignedUserId: true,
                    statusStepper: {
                        where: {
                            status: {
                                in: [
                                    'Ready for Dispatch',
                                    'WIP Storage'
                                ]
                            }
                        },
                        select: {
                            status: true
                        }
                    },
                    product: {
                        select: {
                            name: true
                        }
                    },
                    customer: {
                        select: {
                            name: true
                        }
                    },
                    salesZone: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    id: 'desc'
                },
                skip,
                take: limit
            }),
            this.prisma.salesOrder.count({
                where
            })
        ]);
        const fgData = salesOrders.map((order)=>{
            const isReadyForDispatch = order.statusStepper.some((s)=>s.status === 'Ready for Dispatch');
            const isWipStorage = order.statusStepper.some((s)=>s.status === 'WIP Storage');
            return {
                id: order.id,
                deliveryDate: order.deliveryDate,
                saleOrderNumber: order.saleOrderNumber,
                transferOrder: order.transferOrder,
                product: order.product?.name,
                customerName: order.customer?.name,
                salesZone: order.salesZone?.name,
                payment: order.paymentClearance,
                status: order.status,
                fgLocation: order.fgLocation,
                specialRemarks: order.specialRemarks,
                updatedBy: order.UpdatedBy,
                updatedDate: order.UpdatedDate,
                assignedUserId: order.assignedUserId,
                isReadyForDispatch,
                isWipStorage
            };
        });
        return {
            data: fgData,
            totalCount
        };
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
FgDashboardService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], FgDashboardService);

//# sourceMappingURL=fg-dashboard.service.js.map