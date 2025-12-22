"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DashboardService", {
    enumerable: true,
    get: function() {
        return DashboardService;
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
function calculatePercentageChange(current, previous) {
    if (previous === 0) {
        return current > 0 ? 100.0 : 0.0;
    }
    const change = (current - previous) / previous * 100;
    return parseFloat(change.toFixed(1));
}
function getDayBoundariesIST(date) {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS);
    const endOfDay = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - IST_OFFSET_MS);
    return {
        startOfDay,
        endOfDay
    };
}
let DashboardService = class DashboardService {
    async getAdminKpis() {
        const now = new Date();
        const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const { startOfDay: startOfToday } = getDayBoundariesIST(now);
        const [totalSoCount, newSoCurrentMonth, newSoPreviousMonth, overdueCount, overdueCountPrevious, dispatchedTotalCount, dispatchedCurrentMonth, dispatchedPreviousMonth] = await this.prisma.$transaction([
            this.prisma.salesOrder.count(),
            this.prisma.salesOrder.count({
                where: {
                    createdAt: {
                        gte: firstDayCurrentMonth,
                        lt: firstDayNextMonth
                    }
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    createdAt: {
                        gte: firstDayPreviousMonth,
                        lt: firstDayCurrentMonth
                    }
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    deliveryDate: {
                        lt: startOfToday
                    },
                    status: {
                        not: 'Dispatched'
                    }
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    deliveryDate: {
                        lt: firstDayCurrentMonth
                    },
                    status: {
                        not: 'Dispatched'
                    }
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    status: 'Dispatched'
                }
            }),
            this.prisma.sO_Status_Stepper.count({
                where: {
                    status: 'Dispatched',
                    createdDateTime: {
                        gte: firstDayCurrentMonth,
                        lt: firstDayNextMonth
                    }
                }
            }),
            this.prisma.sO_Status_Stepper.count({
                where: {
                    status: 'Dispatched',
                    createdDateTime: {
                        gte: firstDayPreviousMonth,
                        lt: firstDayCurrentMonth
                    }
                }
            })
        ]);
        const totalSoCountPercentageChange = calculatePercentageChange(newSoCurrentMonth, newSoPreviousMonth);
        const overdueSoCountPercentageChange = calculatePercentageChange(overdueCount, overdueCountPrevious);
        const dispatchedSoCountPercentageChange = calculatePercentageChange(dispatchedCurrentMonth, dispatchedPreviousMonth);
        return {
            totalSoCount,
            totalSoCountPercentageChange,
            overdueSoCount: overdueCount,
            overdueSoCountPercentageChange,
            dispatchedSoCount: dispatchedTotalCount,
            dispatchedSoCountPercentageChange
        };
    }
    async getAdminNewImports() {
        const results = [];
        const today = new Date();
        for(let i = 0; i < 5; i++){
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - i);
            const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);
            const count = await this.prisma.salesOrder.count({
                where: {
                    createdAt: {
                        gte: startOfDay,
                        lt: endOfDay
                    }
                }
            });
            const formattedDate = targetDate.toISOString().split('T')[0];
            let dayLabel;
            if (i === 0) dayLabel = `Today (${targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })})`;
            else if (i === 1) dayLabel = `Yesterday (${targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })})`;
            else dayLabel = targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            results.push({
                dayLabel: dayLabel,
                date: formattedDate,
                count: count
            });
        }
        return results;
    }
    async getAdminDispatchSummary() {
        const { startOfDay, endOfDay } = getDayBoundariesIST(new Date());
        const [ordersToBeDispatched, readyForDispatchToday, ordersDispatchedToday] = await this.prisma.$transaction([
            this.prisma.salesOrder.count({
                where: {
                    deliveryDate: {
                        gte: startOfDay,
                        lt: endOfDay
                    },
                    OR: [
                        {
                            status: null
                        },
                        {
                            status: {
                                not: 'Dispatched'
                            }
                        }
                    ]
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    deliveryDate: {
                        gte: startOfDay,
                        lt: endOfDay
                    },
                    status: {
                        not: 'Dispatched'
                    },
                    statusStepper: {
                        some: {
                            status: 'Ready for Dispatch',
                            createdDateTime: {
                                not: null
                            }
                        }
                    }
                }
            }),
            this.prisma.sO_Status_Stepper.count({
                where: {
                    status: 'Dispatched',
                    createdDateTime: {
                        gte: startOfDay,
                        lt: endOfDay
                    }
                }
            })
        ]);
        return {
            ordersToBeDispatched,
            readyForDispatchToday,
            ordersDispatchedToday
        };
    }
    async getAdminOverallStatus() {
        const [statusCounts, totalOrders] = await Promise.all([
            this.prisma.salesOrder.groupBy({
                by: [
                    'status'
                ],
                _count: {
                    id: true
                }
            }),
            this.prisma.salesOrder.count()
        ]);
        const result = {
            totalOrders,
            toBeIssuedCount: 0,
            r105Count: 0,
            w105Count: 0,
            f105Count: 0,
            dispatchedCount: 0
        };
        for (const group of statusCounts){
            if (group.status === null) {
                result.toBeIssuedCount = group._count.id;
            } else {
                switch(group.status){
                    case 'R105':
                        result.r105Count = group._count.id;
                        break;
                    case 'W105':
                        result.w105Count = group._count.id;
                        break;
                    case 'F105':
                        result.f105Count = group._count.id;
                        break;
                    case 'Dispatched':
                        result.dispatchedCount = group._count.id;
                        break;
                }
            }
        }
        return result;
    }
    async getAdminStatusByZone() {
        const allZones = await this.prisma.salesZone.findMany({
            select: {
                id: true,
                name: true
            }
        });
        const statusCounts = await this.prisma.salesOrder.groupBy({
            by: [
                'salesZoneId',
                'status'
            ],
            _count: {
                id: true
            }
        });
        const resultsMap = new Map();
        for (const zone of allZones){
            resultsMap.set(zone.id, {
                zoneName: zone.name,
                toBeIssuedCount: 0,
                r105Count: 0,
                w105Count: 0,
                f105Count: 0,
                dispatchedCount: 0
            });
        }
        for (const group of statusCounts){
            const zone = resultsMap.get(group.salesZoneId);
            if (zone) {
                if (group.status === null) {
                    zone.toBeIssuedCount = group._count.id;
                } else {
                    switch(group.status){
                        case 'R105':
                            zone.r105Count = group._count.id;
                            break;
                        case 'W105':
                            zone.w105Count = group._count.id;
                            break;
                        case 'F105':
                            zone.f105Count = group._count.id;
                            break;
                        case 'Dispatched':
                            zone.dispatchedCount = group._count.id;
                            break;
                    }
                }
            }
        }
        return Array.from(resultsMap.values());
    }
    async getAdminPaymentByZone() {
        const allZones = await this.prisma.salesZone.findMany({
            select: {
                id: true,
                name: true
            }
        });
        const paymentCounts = await this.prisma.salesOrder.groupBy({
            by: [
                'salesZoneId',
                'paymentClearance'
            ],
            _count: {
                id: true
            }
        });
        const resultsMap = new Map();
        for (const zone of allZones){
            resultsMap.set(zone.id, {
                zoneName: zone.name,
                paymentCleared: 0,
                paymentPending: 0
            });
        }
        for (const group of paymentCounts){
            const zone = resultsMap.get(group.salesZoneId);
            if (zone) {
                if (group.paymentClearance === true) {
                    zone.paymentCleared = group._count.id;
                } else {
                    zone.paymentPending = group._count.id;
                }
            }
        }
        return Array.from(resultsMap.values());
    }
    async getAdminOrdersByProduct() {
        const counts = await this.prisma.salesOrder.groupBy({
            by: [
                'productId'
            ],
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 5
        });
        const productIds = counts.map((c)=>c.productId);
        const products = await this.prisma.product.findMany({
            where: {
                id: {
                    in: productIds
                }
            },
            select: {
                id: true,
                name: true
            }
        });
        const productMap = new Map(products.map((p)=>[
                p.id,
                p.name
            ]));
        return counts.map((group)=>({
                name: productMap.get(group.productId) || 'Unknown Product',
                count: group._count.id
            }));
    }
    async getAdminOrdersByCustomer() {
        const counts = await this.prisma.salesOrder.groupBy({
            by: [
                'customerId'
            ],
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 5
        });
        const customerIds = counts.map((c)=>c.customerId).filter(Boolean);
        const customers = await this.prisma.customer.findMany({
            where: {
                id: {
                    in: customerIds
                }
            },
            select: {
                id: true,
                name: true
            }
        });
        const customerMap = new Map(customers.map((c)=>[
                c.id,
                c.name
            ]));
        return counts.map((group)=>({
                name: group.customerId ? customerMap.get(group.customerId) || 'Unknown Customer' : 'No Customer',
                count: group._count.id
            }));
    }
    async getSalesKpis(userId) {
        const [totalSoCount, dispatchedSoCount, r105Count, w105Count, f105Count, toBeIssuedCount] = await this.prisma.$transaction([
            this.prisma.salesOrder.count({
                where: {
                    userId: userId
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: 'Dispatched'
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: 'R105'
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: 'W105'
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: 'F105'
                }
            }),
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: null
                }
            })
        ]);
        return {
            totalSoCount,
            dispatchedSoCount,
            r105Count,
            w105Count,
            f105Count,
            toBeIssuedCount
        };
    }
    async getSalesRecentActivity(userId) {
        const userOrders = await this.prisma.salesOrder.findMany({
            where: {
                userId: userId
            },
            select: {
                saleOrderNumber: true
            }
        });
        if (userOrders.length === 0) {
            return [];
        }
        const userSoNumbers = userOrders.map((o)=>o.saleOrderNumber);
        const latestActivityGroups = await this.prisma.sO_Status_Stepper.groupBy({
            by: [
                'salesOrderNumber'
            ],
            _max: {
                createdDateTime: true
            },
            where: {
                salesOrderNumber: {
                    in: userSoNumbers
                },
                createdDateTime: {
                    not: null
                }
            },
            orderBy: {
                _max: {
                    createdDateTime: 'desc'
                }
            },
            take: 5
        });
        if (latestActivityGroups.length === 0) {
            return [];
        }
        const whereConditions = latestActivityGroups.map((group)=>({
                salesOrderNumber: group.salesOrderNumber,
                createdDateTime: group._max.createdDateTime
            }));
        const activities = await this.prisma.sO_Status_Stepper.findMany({
            where: {
                OR: whereConditions
            },
            select: {
                salesOrderNumber: true,
                status: true,
                createdDateTime: true
            },
            orderBy: {
                createdDateTime: 'desc'
            }
        });
        return activities.map((act)=>({
                salesOrderNumber: act.salesOrderNumber,
                status: act.status,
                activityTimestamp: act.createdDateTime
            }));
    }
    async getSalesPaymentClearanceByZone(userId) {
        const rawCounts = await this.prisma.salesOrder.groupBy({
            by: [
                'salesZoneId',
                'paymentClearance'
            ],
            where: {
                userId: userId
            },
            _count: {
                id: true
            }
        });
        if (rawCounts.length === 0) {
            return [];
        }
        const zoneIds = [
            ...new Set(rawCounts.map((r)=>r.salesZoneId))
        ];
        const zones = await this.prisma.salesZone.findMany({
            where: {
                id: {
                    in: zoneIds
                }
            },
            select: {
                id: true,
                name: true
            }
        });
        const resultsMap = new Map();
        for (const zone of zones){
            resultsMap.set(zone.id, {
                zoneName: zone.name,
                paymentCleared: 0,
                paymentPending: 0
            });
        }
        for (const countData of rawCounts){
            const zone = resultsMap.get(countData.salesZoneId);
            if (zone) {
                if (countData.paymentClearance === true) {
                    zone.paymentCleared = countData._count.id;
                } else {
                    zone.paymentPending = countData._count.id;
                }
            }
        }
        return Array.from(resultsMap.values());
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
DashboardService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], DashboardService);

//# sourceMappingURL=dashboard.service.js.map