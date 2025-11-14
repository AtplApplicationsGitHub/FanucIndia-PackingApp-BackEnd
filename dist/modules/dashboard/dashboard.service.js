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
    // ... (existing function)
    if (previous === 0) {
        return current > 0 ? 100.0 : 0.0; // If previous was 0, any increase is 100%
    }
    const change = (current - previous) / previous * 100;
    return parseFloat(change.toFixed(1)); // Return with one decimal place
}
/**
 * [FIX] Helper to get date boundaries for queries, aware of IST.
 * This creates UTC timestamps that represent the start/end of a day in IST.
 */ function getDayBoundariesIST(date) {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    // Get date components in local time (which we assume is IST for the server)
    const y = date.getFullYear();
    const m = date.getMonth(); // 0-11
    const d = date.getDate();
    // Create start of day in UTC, then subtract offset to get IST start-of-day
    const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS);
    // Create start of *next* day in UTC, then subtract offset
    const endOfDay = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - IST_OFFSET_MS);
    return {
        startOfDay,
        endOfDay
    };
}
let DashboardService = class DashboardService {
    /**
   * Gets the KPI counts for the ADMIN dashboard.
   */ async getAdminKpis() {
        // ... (existing getAdminKpis logic)
        const now = new Date();
        const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // [FIX] Use the IST-aware helper to get the start of today
        const { startOfDay: startOfToday } = getDayBoundariesIST(now);
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
                        lt: startOfToday
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
    // --- NEW ADMIN METHODS ---
    /**
   * Gets the count of new ERP material imports for the last 5 days.
   */ async getAdminNewImports() {
        const results = [];
        const today = new Date();
        const dayLabels = [
            'Today',
            'Yesterday',
            '2 days ago',
            '3 days ago',
            '4 days ago'
        ];
        for(let i = 0; i < 5; i++){
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - i);
            const { startOfDay, endOfDay } = getDayBoundariesIST(targetDate);
            // We count distinct SO numbers from the log table for that day
            const distinctImports = await this.prisma.eRPMaterialLog.findMany({
                where: {
                    dateTime: {
                        gte: startOfDay,
                        lt: endOfDay
                    }
                },
                select: {
                    soNo: true
                },
                distinct: [
                    'soNo'
                ]
            });
            const formattedDate = targetDate.toISOString().split('T')[0];
            const label = i < 2 ? `${dayLabels[i]} (${targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })})` : targetDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            results.push({
                dayLabel: i === 0 ? `Today (${targetDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                })})` : label,
                date: formattedDate,
                count: distinctImports.length
            });
        }
        return results;
    }
    /**
   * Gets a summary of dispatch statuses for today.
   */ async getAdminDispatchSummary() {
        const { startOfDay, endOfDay } = getDayBoundariesIST(new Date());
        const [ordersToBeDispatched, ordersDispatchedToday] = await this.prisma.$transaction([
            // Orders to be Dispatched: Delivery date is today AND status is NOT Dispatched
            this.prisma.salesOrder.count({
                where: {
                    deliveryDate: {
                        gte: startOfDay,
                        lt: endOfDay
                    },
                    status: {
                        not: 'Dispatched'
                    }
                }
            }),
            // Orders Dispatched Today: Stepper status 'Dispatched' was timestamped today
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
            ordersDispatchedToday
        };
    }
    /**
   * Gets the system-wide count of orders by their current status.
   */ async getAdminOverallStatus() {
        const statusCounts = await this.prisma.salesOrder.groupBy({
            by: [
                'status'
            ],
            _count: {
                id: true
            },
            where: {
                status: {
                    in: [
                        'R105',
                        'W105',
                        'F105',
                        'Dispatched'
                    ]
                }
            }
        });
        const result = {
            r105Count: 0,
            w105Count: 0,
            f105Count: 0,
            dispatchedCount: 0
        };
        for (const group of statusCounts){
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
        return result;
    }
    // --- EXISTING SALES METHODS ---
    /**
   * Gets the KPI counts for a specific SALES user.
   */ async getSalesKpis(userId) {
        // ... (existing getSalesKpis logic)
        const [totalSoCount, dispatchedSoCount, r105Count, w105Count, f105Count] = await this.prisma.$transaction([
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
            })
        ]);
        return {
            totalSoCount,
            dispatchedSoCount,
            r105Count,
            w105Count,
            f105Count
        };
    }
    /**
   * Gets the 5 most recent activities for a SALES user.
   * [MODIFIED] This now returns the 5 most recently active *unique* orders.
   * @param userId The ID of the logged-in SALES user.
   */ async getSalesRecentActivity(userId) {
        // 1. Get user's SO numbers
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
        // 2. Group by SO number, find the max (latest) timestamp for each
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
            // 3. Order by that latest timestamp (desc) and take the top 5
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
        // 4. Create a list of 'where' conditions to find these specific rows
        const whereConditions = latestActivityGroups.map((group)=>({
                salesOrderNumber: group.salesOrderNumber,
                createdDateTime: group._max.createdDateTime
            }));
        // 5. Fetch all matching full records in one query
        const activities = await this.prisma.sO_Status_Stepper.findMany({
            where: {
                OR: whereConditions
            },
            select: {
                salesOrderNumber: true,
                status: true,
                createdDateTime: true
            },
            // 6. Order the final list
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
    /**
   * Gets payment clearance counts grouped by sales zone for a SALES user.
   */ async getSalesPaymentClearanceByZone(userId) {
        // ... (existing getSalesPaymentClearanceByZone logic)
        const allZones = await this.prisma.salesZone.findMany({
            select: {
                id: true,
                name: true
            },
            orderBy: {
                name: 'asc'
            }
        });
        const rawCounts = await this.prisma.salesOrder.groupBy({
            by: [
                'salesZoneId',
                'paymentClearance'
            ],
            where: {
                userId: userId,
                status: {
                    not: 'Dispatched'
                }
            },
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