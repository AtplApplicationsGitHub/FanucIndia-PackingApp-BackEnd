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
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        if (!dto.code || !dto.code.trim())
            throw new Error('Code is required');
        return this.prisma.product.create({
            data: { name: dto.name.trim(), code: dto.code.trim() },
        });
    }
    updateProduct(id, dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        if (!dto.code || !dto.code.trim())
            throw new Error('Code is required');
        return this.prisma.product.update({
            where: { id },
            data: { name: dto.name.trim(), code: dto.code.trim() },
        });
    }
    async deleteProduct(id) {
        const usageCount = await this.prisma.salesOrder.count({
            where: { productId: id }
        });
        if (usageCount > 0) {
            throw new common_1.BadRequestException('Cannot delete: This product is used in one or more orders.');
        }
        return this.prisma.product.delete({ where: { id } });
    }
    getTransporters() {
        return this.prisma.transporter.findMany({ orderBy: { name: 'asc' } });
    }
    createTransporter(dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        return this.prisma.transporter.create({ data: { name: dto.name.trim() } });
    }
    updateTransporter(id, dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        return this.prisma.transporter.update({
            where: { id },
            data: { name: dto.name.trim() },
        });
    }
    deleteTransporter(id) {
        return this.prisma.transporter.delete({ where: { id } });
    }
    getPlantCodes() {
        return this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } });
    }
    createPlantCode(dto) {
        if (!dto.code || !dto.code.trim())
            throw new Error('Code is required');
        if (!dto.description || !dto.description.trim())
            throw new Error('Description is required');
        return this.prisma.plantCode.create({
            data: { code: dto.code.trim(), description: dto.description.trim() },
        });
    }
    updatePlantCode(id, dto) {
        if (!dto.code || !dto.code.trim())
            throw new Error('Code is required');
        if (!dto.description || !dto.description.trim())
            throw new Error('Description is required');
        return this.prisma.plantCode.update({
            where: { id },
            data: { code: dto.code.trim(), description: dto.description.trim() },
        });
    }
    deletePlantCode(id) {
        return this.prisma.plantCode.delete({ where: { id } });
    }
    getSalesZones() {
        return this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } });
    }
    createSalesZone(dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        return this.prisma.salesZone.create({ data: { name: dto.name.trim() } });
    }
    updateSalesZone(id, dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        return this.prisma.salesZone.update({
            where: { id },
            data: { name: dto.name.trim() },
        });
    }
    deleteSalesZone(id) {
        return this.prisma.salesZone.delete({ where: { id } });
    }
    getPackConfigs() {
        return this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } });
    }
    createPackConfig(dto) {
        if (!dto.configName || !dto.configName.trim())
            throw new Error('Config Name is required');
        return this.prisma.packConfig.create({
            data: { configName: dto.configName.trim() },
        });
    }
    updatePackConfig(id, dto) {
        if (!dto.configName || !dto.configName.trim())
            throw new Error('Config Name is required');
        return this.prisma.packConfig.update({
            where: { id },
            data: { configName: dto.configName.trim() },
        });
    }
    deletePackConfig(id) {
        return this.prisma.packConfig.delete({ where: { id } });
    }
    getTerminals() {
        return this.prisma.terminal.findMany({ orderBy: { name: 'asc' } });
    }
    createTerminal(dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        return this.prisma.terminal.create({ data: { name: dto.name.trim() } });
    }
    updateTerminal(id, dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        return this.prisma.terminal.update({
            where: { id },
            data: { name: dto.name.trim() },
        });
    }
    deleteTerminal(id) {
        return this.prisma.terminal.delete({ where: { id } });
    }
    getCustomers() {
        return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
    }
    createCustomer(dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        if (!dto.address || !dto.address.trim())
            throw new Error('Address is required');
        return this.prisma.customer.create({
            data: { name: dto.name.trim(), address: dto.address.trim() },
        });
    }
    updateCustomer(id, dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        if (!dto.address || !dto.address.trim())
            throw new Error('Address is required');
        return this.prisma.customer.update({
            where: { id },
            data: { name: dto.name.trim(), address: dto.address.trim() },
        });
    }
    deleteCustomer(id) {
        return this.prisma.customer.delete({ where: { id } });
    }
    getPrinters() {
        return this.prisma.printer.findMany({ orderBy: { name: 'asc' } });
    }
    createPrinter(dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        return this.prisma.printer.create({ data: { name: dto.name.trim() } });
    }
    updatePrinter(id, dto) {
        if (!dto.name || !dto.name.trim())
            throw new Error('Name is required');
        return this.prisma.printer.update({
            where: { id },
            data: { name: dto.name.trim() },
        });
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