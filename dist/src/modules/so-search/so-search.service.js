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
exports.SoSearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
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
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = convertBigInts(obj[key]);
            }
        }
    }
    return obj;
}
let SoSearchService = class SoSearchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findDetailsBySoNumber(saleOrderNumber, user) {
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: { saleOrderNumber },
            include: {
                customer: true,
                product: true,
                transporter: true,
                plantCode: true,
                salesZone: true,
                packConfig: true,
                user: { select: { name: true } },
                assignedUser: { select: { name: true } },
            },
        });
        if (!salesOrder) {
            throw new common_1.NotFoundException('Sales Order not found');
        }
        if (user.role === 'SALES' && salesOrder.userId !== user.userId) {
            throw new common_1.ForbiddenException('You are not authorized to view this order.');
        }
        const dispatchSOs = await this.prisma.dispatch_SO.findMany({
            where: { saleOrderNumber },
            select: { dispatchId: true },
        });
        const dispatchIds = dispatchSOs.map((dso) => dso.dispatchId);
        const dispatchInfo = await this.prisma.dispatch.findMany({
            where: {
                id: { in: dispatchIds },
            },
            include: {
                customer: { select: { name: true, address: true } },
                transporter: { select: { name: true } },
            },
        });
        const materialDetails = await this.prisma.eRP_Material_Data.findMany({
            where: { saleOrderNumber },
        });
        const result = {
            salesOrder,
            dispatchInfo,
            materialDetails,
        };
        return convertBigInts(result);
    }
};
exports.SoSearchService = SoSearchService;
exports.SoSearchService = SoSearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SoSearchService);
//# sourceMappingURL=so-search.service.js.map