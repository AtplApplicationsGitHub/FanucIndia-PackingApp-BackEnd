"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoSearchService", {
    enumerable: true,
    get: function() {
        return SoSearchService;
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
function convertBigInts(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertBigInts);
    }
    if (typeof obj === 'object') {
        for(const key in obj){
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = convertBigInts(obj[key]);
            }
        }
    }
    return obj;
}
let SoSearchService = class SoSearchService {
    async findDetailsBySoNumber(saleOrderNumber, user) {
        // 1. Search in primary tables
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: {
                saleOrderNumber
            },
            include: {
                customer: true,
                product: true,
                transporter: true,
                plantCode: true,
                salesZone: true,
                packConfig: true,
                user: {
                    select: {
                        name: true
                    }
                },
                assignedUser: {
                    select: {
                        name: true
                    }
                }
            }
        });
        if (salesOrder) {
            // Apply permission check for primary orders
            if (user.role === 'SALES' && salesOrder.userId !== user.userId) {
                throw new _common.ForbiddenException('You are not authorized to view this order.');
            }
            const dispatchSOs = await this.prisma.dispatch_SO.findMany({
                where: {
                    saleOrderNumber
                },
                select: {
                    dispatchId: true
                }
            });
            const dispatchIds = dispatchSOs.map((dso)=>dso.dispatchId);
            const dispatchInfo = await this.prisma.dispatch.findMany({
                where: {
                    id: {
                        in: dispatchIds
                    }
                },
                include: {
                    customer: true,
                    transporter: true
                }
            });
            const materialDetails = await this.prisma.eRP_Material_Data.findMany({
                where: {
                    saleOrderNumber
                },
                orderBy: {
                    ID: 'asc'
                }
            });
            const result = {
                salesOrder,
                dispatchInfo,
                materialDetails,
                isArchived: false
            };
            return convertBigInts(result);
        }
        // 2. If not found, search in archive tables
        const archivedSalesOrder = await this.prisma.salesOrderArchive.findFirst({
            where: {
                saleOrderNumber
            }
        });
        if (archivedSalesOrder) {
            const dispatchSOArchives = await this.prisma.dispatch_SOArchive.findMany({
                where: {
                    saleOrderNumber
                },
                select: {
                    dispatchId: true
                }
            });
            const dispatchIds = dispatchSOArchives.map((d)=>d.dispatchId);
            const dispatchInfo = await this.prisma.dispatchArchive.findMany({
                where: {
                    id: {
                        in: dispatchIds
                    }
                }
            });
            const materialDetails = await this.prisma.eRP_Material_DataArchive.findMany({
                where: {
                    saleOrderNumber
                },
                orderBy: {
                    ID: 'asc'
                }
            });
            const result = {
                salesOrder: archivedSalesOrder,
                dispatchInfo,
                materialDetails,
                isArchived: true
            };
            return convertBigInts(result);
        }
        // 3. If not found in either, throw an error
        throw new _common.NotFoundException(`Sales Order with number '${saleOrderNumber}' not found.`);
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
SoSearchService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], SoSearchService);

//# sourceMappingURL=so-search.service.js.map