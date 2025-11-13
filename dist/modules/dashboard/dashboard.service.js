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
/**
 * Calculates percentage change, handling division by zero.
 */ function calculatePercentageChange(current, previous) {
    if (previous === 0) {
        return current > 0 ? 100.0 : 0.0; // If previous was 0, any increase is 100%
    }
    const change = (current - previous) / previous * 100;
    return parseFloat(change.toFixed(1)); // Return with one decimal place
}
let DashboardService = class DashboardService {
    /**
   * Gets the KPI counts for the ADMIN dashboard.
   */ async getAdminKpis() {
        const now = new Date();
        const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const [totalSoCount, newSoCurrentMonth, newSoPreviousMonth, overdueCount, overdueCountPrevious, dispatchedTotalCount, dispatchedCurrentMonth, dispatchedPreviousMonth] = await this.prisma.$transaction([
            // 1. Total SO Count (Main KPI)
            this.prisma.salesOrder.count(),
            // 2. New SO This Month (for % change)
            this.prisma.salesOrder.count({
                where: {
                    createdAt: {
                        gte: firstDayCurrentMonth,
                        lt: firstDayNextMonth
                    }
                }
            }),
            // 3. New SO Last Month (for % change)
            this.prisma.salesOrder.count({
                where: {
                    createdAt: {
                        gte: firstDayPreviousMonth,
                        lt: firstDayCurrentMonth
                    }
                }
            }),
            // 4. Overdue Count (Main KPI - Snapshot NOW)
            this.prisma.salesOrder.count({
                where: {
                    deliveryDate: {
                        lt: now
                    },
                    status: {
                        not: 'Dispatched'
                    }
                }
            }),
            // 5. Overdue Count (Snapshot at START of month - for % change)
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
            // 6. Dispatched Count (Main KPI)
            this.prisma.salesOrder.count({
                where: {
                    status: 'Dispatched'
                }
            }),
            // 7. Dispatched This Month (for % change - from Stepper)
            this.prisma.sO_Status_Stepper.count({
                where: {
                    status: 'Dispatched',
                    createdDateTime: {
                        gte: firstDayCurrentMonth,
                        lt: firstDayNextMonth
                    }
                }
            }),
            // 8. Dispatched Last Month (for % change - from Stepper)
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
        // Calculate percentages
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
    /**
   * Gets the KPI counts for a specific SALES user.
   * @param userId The ID of the logged-in SALES user.
   */ async getSalesKpis(userId) {
        // ... existing getSalesKpis logic remains unchanged
        const now = new Date();
        const [totalSoCount, dispatchedSoCount, overdueSoCount, r105Count, w105Count, f105Count] = await this.prisma.$transaction([
            // 1. TOTAL SO COUNT
            this.prisma.salesOrder.count({
                where: {
                    userId: userId
                }
            }),
            // 2. DISPATCHED ORDERS (for KPI card)
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: 'Dispatched'
                }
            }),
            // 3. OVERDUE ORDERS
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    deliveryDate: {
                        lt: now
                    },
                    status: {
                        not: 'Dispatched'
                    }
                }
            }),
            // --- NEW QUERIES FOR PIE CHART ---
            // 4. R105 (Assigned/Imported)
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: 'R105'
                }
            }),
            // 5. W105 (Issued)
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: 'W105'
                }
            }),
            // 6. F105 (Packed)
            this.prisma.salesOrder.count({
                where: {
                    userId: userId,
                    status: 'F105'
                }
            })
        ]);
        return {
            totalSoCount,
            dispatchedSoCount,
            overdueSoCount,
            r105Count,
            w105Count,
            f105Count
        };
    }
    /**
   * Gets the 5 most recent activities for a SALES user.
   * @param userId The ID of the logged-in SALES user.
   */ async getSalesRecentActivity(userId) {
        // ... existing getSalesRecentActivity logic remains unchanged
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
        const activities = await this.prisma.sO_Status_Stepper.findMany({
            where: {
                salesOrderNumber: {
                    in: userSoNumbers
                },
                createdDateTime: {
                    not: null
                }
            },
            select: {
                salesOrderNumber: true,
                status: true,
                createdDateTime: true
            },
            orderBy: {
                createdDateTime: 'desc'
            },
            take: 5
        });
        return activities.map((act)=>({
                salesOrderNumber: act.salesOrderNumber,
                status: act.status,
                activityTimestamp: act.createdDateTime
            }));
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