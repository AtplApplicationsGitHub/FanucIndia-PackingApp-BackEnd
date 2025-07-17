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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupController = void 0;
const common_1 = require("@nestjs/common");
const lookup_service_1 = require("./lookup.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let LookupController = class LookupController {
    lookupService;
    constructor(lookupService) {
        this.lookupService = lookupService;
    }
    getProducts() {
        return this.lookupService.getProducts();
    }
    createProduct(dto) {
        return this.lookupService.createProduct(dto);
    }
    updateProduct(id, dto) {
        return this.lookupService.updateProduct(+id, dto);
    }
    async deleteProduct(id) {
        return this.lookupService.deleteProduct(Number(id));
    }
    getTransporters() {
        return this.lookupService.getTransporters();
    }
    createTransporter(dto) {
        return this.lookupService.createTransporter(dto);
    }
    updateTransporter(id, dto) {
        return this.lookupService.updateTransporter(+id, dto);
    }
    deleteTransporter(id) {
        return this.lookupService.deleteTransporter(+id);
    }
    getPlantCodes() {
        return this.lookupService.getPlantCodes();
    }
    createPlantCode(dto) {
        return this.lookupService.createPlantCode(dto);
    }
    updatePlantCode(id, dto) {
        return this.lookupService.updatePlantCode(+id, dto);
    }
    deletePlantCode(id) {
        return this.lookupService.deletePlantCode(+id);
    }
    getSalesZones() {
        return this.lookupService.getSalesZones();
    }
    createSalesZone(dto) {
        return this.lookupService.createSalesZone(dto);
    }
    updateSalesZone(id, dto) {
        return this.lookupService.updateSalesZone(+id, dto);
    }
    deleteSalesZone(id) {
        return this.lookupService.deleteSalesZone(+id);
    }
    getPackConfigs() {
        return this.lookupService.getPackConfigs();
    }
    createPackConfig(dto) {
        return this.lookupService.createPackConfig(dto);
    }
    updatePackConfig(id, dto) {
        return this.lookupService.updatePackConfig(+id, dto);
    }
    deletePackConfig(id) {
        return this.lookupService.deletePackConfig(+id);
    }
    getTerminals() {
        return this.lookupService.getTerminals();
    }
    createTerminal(dto) {
        return this.lookupService.createTerminal(dto);
    }
    updateTerminal(id, dto) {
        return this.lookupService.updateTerminal(+id, dto);
    }
    deleteTerminal(id) {
        return this.lookupService.deleteTerminal(+id);
    }
    getCustomers() {
        return this.lookupService.getCustomers();
    }
    createCustomer(dto) {
        return this.lookupService.createCustomer(dto);
    }
    updateCustomer(id, dto) {
        return this.lookupService.updateCustomer(+id, dto);
    }
    deleteCustomer(id) {
        return this.lookupService.deleteCustomer(+id);
    }
    getPrinters() {
        return this.lookupService.getPrinters();
    }
    createPrinter(dto) {
        return this.lookupService.createPrinter(dto);
    }
    updatePrinter(id, dto) {
        return this.lookupService.updatePrinter(+id, dto);
    }
    deletePrinter(id) {
        return this.lookupService.deletePrinter(+id);
    }
};
exports.LookupController = LookupController;
__decorate([
    (0, common_1.Get)('products'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Post)('products'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Patch)('products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LookupController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)('transporters'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getTransporters", null);
__decorate([
    (0, common_1.Post)('transporters'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createTransporter", null);
__decorate([
    (0, common_1.Patch)('transporters/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateTransporter", null);
__decorate([
    (0, common_1.Delete)('transporters/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deleteTransporter", null);
__decorate([
    (0, common_1.Get)('plant-codes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getPlantCodes", null);
__decorate([
    (0, common_1.Post)('plant-codes'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createPlantCode", null);
__decorate([
    (0, common_1.Patch)('plant-codes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updatePlantCode", null);
__decorate([
    (0, common_1.Delete)('plant-codes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deletePlantCode", null);
__decorate([
    (0, common_1.Get)('sales-zones'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getSalesZones", null);
__decorate([
    (0, common_1.Post)('sales-zones'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createSalesZone", null);
__decorate([
    (0, common_1.Patch)('sales-zones/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateSalesZone", null);
__decorate([
    (0, common_1.Delete)('sales-zones/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deleteSalesZone", null);
__decorate([
    (0, common_1.Get)('pack-configs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getPackConfigs", null);
__decorate([
    (0, common_1.Post)('pack-configs'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createPackConfig", null);
__decorate([
    (0, common_1.Patch)('pack-configs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updatePackConfig", null);
__decorate([
    (0, common_1.Delete)('pack-configs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deletePackConfig", null);
__decorate([
    (0, common_1.Get)('terminals'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getTerminals", null);
__decorate([
    (0, common_1.Post)('terminals'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createTerminal", null);
__decorate([
    (0, common_1.Patch)('terminals/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateTerminal", null);
__decorate([
    (0, common_1.Delete)('terminals/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deleteTerminal", null);
__decorate([
    (0, common_1.Get)('customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Post)('customers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Patch)('customers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Delete)('customers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deleteCustomer", null);
__decorate([
    (0, common_1.Get)('printers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getPrinters", null);
__decorate([
    (0, common_1.Post)('printers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createPrinter", null);
__decorate([
    (0, common_1.Patch)('printers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updatePrinter", null);
__decorate([
    (0, common_1.Delete)('printers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deletePrinter", null);
exports.LookupController = LookupController = __decorate([
    (0, swagger_1.ApiTags)('Lookup'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('lookup'),
    __metadata("design:paramtypes", [lookup_service_1.LookupService])
], LookupController);
//# sourceMappingURL=lookup.controller.js.map