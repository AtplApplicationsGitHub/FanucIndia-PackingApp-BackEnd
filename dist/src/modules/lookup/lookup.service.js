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
    createProduct(dto) {
        return this.prisma.product.create({ data: dto });
    }
    updateProduct(id, dto) {
        return this.prisma.product.update({ where: { id }, data: dto });
    }
    deleteProduct(id) {
        return this.prisma.product.delete({ where: { id } });
    }
    getTransporters() {
        return this.prisma.transporter.findMany({ orderBy: { name: 'asc' } });
    }
    createTransporter(dto) {
        return this.prisma.transporter.create({ data: dto });
    }
    updateTransporter(id, dto) {
        return this.prisma.transporter.update({ where: { id }, data: dto });
    }
    deleteTransporter(id) {
        return this.prisma.transporter.delete({ where: { id } });
    }
    getPlantCodes() {
        return this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } });
    }
    createPlantCode(dto) {
        return this.prisma.plantCode.create({ data: dto });
    }
    updatePlantCode(id, dto) {
        return this.prisma.plantCode.update({ where: { id }, data: dto });
    }
    deletePlantCode(id) {
        return this.prisma.plantCode.delete({ where: { id } });
    }
    getSalesZones() {
        return this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } });
    }
    createSalesZone(dto) {
        return this.prisma.salesZone.create({ data: dto });
    }
    updateSalesZone(id, dto) {
        return this.prisma.salesZone.update({ where: { id }, data: dto });
    }
    deleteSalesZone(id) {
        return this.prisma.salesZone.delete({ where: { id } });
    }
    getPackConfigs() {
        return this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } });
    }
    createPackConfig(dto) {
        return this.prisma.packConfig.create({ data: dto });
    }
    updatePackConfig(id, dto) {
        return this.prisma.packConfig.update({ where: { id }, data: dto });
    }
    deletePackConfig(id) {
        return this.prisma.packConfig.delete({ where: { id } });
    }
    getTerminals() {
        return this.prisma.terminal.findMany({ orderBy: { name: 'asc' } });
    }
    createTerminal(dto) {
        return this.prisma.terminal.create({ data: dto });
    }
    updateTerminal(id, dto) {
        return this.prisma.terminal.update({ where: { id }, data: dto });
    }
    deleteTerminal(id) {
        return this.prisma.terminal.delete({ where: { id } });
    }
    getCustomers() {
        return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
    }
    createCustomer(dto) {
        return this.prisma.customer.create({ data: dto });
    }
    updateCustomer(id, dto) {
        return this.prisma.customer.update({ where: { id }, data: dto });
    }
    deleteCustomer(id) {
        return this.prisma.customer.delete({ where: { id } });
    }
    getPrinters() {
        return this.prisma.printer.findMany({ orderBy: { name: 'asc' } });
    }
    createPrinter(dto) {
        return this.prisma.printer.create({ data: dto });
    }
    updatePrinter(id, dto) {
        return this.prisma.printer.update({ where: { id }, data: dto });
    }
    deletePrinter(id) {
        return this.prisma.printer.delete({ where: { id } });
    }
};
exports.LookupService = LookupService;
exports.LookupService = LookupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LookupService);
//# sourceMappingURL=lookup.service.js.map