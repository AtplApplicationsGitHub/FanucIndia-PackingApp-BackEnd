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
exports.LookupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let LookupService = class LookupService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getProducts() {
        return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
    }
    getTransporters() {
        return this.prisma.transporter.findMany({ orderBy: { name: 'asc' } });
    }
    getPlantCodes() {
        return this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } });
    }
    getSalesZones() {
        return this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } });
    }
    getPackConfigs() {
        return this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } });
    }
};
exports.LookupService = LookupService;
exports.LookupService = LookupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LookupService);
//# sourceMappingURL=lookup.service.js.map