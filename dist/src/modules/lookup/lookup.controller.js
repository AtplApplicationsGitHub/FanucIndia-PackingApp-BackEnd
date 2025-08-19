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
const createProductDto_1 = require("./dto/createProductDto");
const updateProductDto_1 = require("./dto/updateProductDto");
const createTransporterDto_1 = require("./dto/createTransporterDto");
const updateTransporterDto_1 = require("./dto/updateTransporterDto");
const createPlantCodeDto_1 = require("./dto/createPlantCodeDto");
const updatePlantCodeDto_1 = require("./dto/updatePlantCodeDto");
const createSalesZoneDto_1 = require("./dto/createSalesZoneDto");
const updateSalesZoneDto_1 = require("./dto/updateSalesZoneDto");
const createPackConfigDto_1 = require("./dto/createPackConfigDto");
const updatePackConfigDto_1 = require("./dto/updatePackConfigDto");
const createCustomerDto_1 = require("./dto/createCustomerDto");
const updateCustomerDto_1 = require("./dto/updateCustomerDto");
const createPrinterDto_1 = require("./dto/createPrinterDto");
const updatePrinterDto_1 = require("./dto/updatePrinterDto");
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
        return this.lookupService.updateProduct(id, dto);
    }
    deleteProduct(id) {
        return this.lookupService.deleteProduct(id);
    }
    getTransporters() {
        return this.lookupService.getTransporters();
    }
    createTransporter(dto) {
        return this.lookupService.createTransporter(dto);
    }
    updateTransporter(id, dto) {
        return this.lookupService.updateTransporter(id, dto);
    }
    deleteTransporter(id) {
        return this.lookupService.deleteTransporter(id);
    }
    getPlantCodes() {
        return this.lookupService.getPlantCodes();
    }
    createPlantCode(dto) {
        return this.lookupService.createPlantCode(dto);
    }
    updatePlantCode(id, dto) {
        return this.lookupService.updatePlantCode(id, dto);
    }
    deletePlantCode(id) {
        return this.lookupService.deletePlantCode(id);
    }
    getSalesZones() {
        return this.lookupService.getSalesZones();
    }
    createSalesZone(dto) {
        return this.lookupService.createSalesZone(dto);
    }
    updateSalesZone(id, dto) {
        return this.lookupService.updateSalesZone(id, dto);
    }
    deleteSalesZone(id) {
        return this.lookupService.deleteSalesZone(id);
    }
    getPackConfigs() {
        return this.lookupService.getPackConfigs();
    }
    createPackConfig(dto) {
        return this.lookupService.createPackConfig(dto);
    }
    updatePackConfig(id, dto) {
        return this.lookupService.updatePackConfig(id, dto);
    }
    deletePackConfig(id) {
        return this.lookupService.deletePackConfig(id);
    }
    getCustomers() {
        return this.lookupService.getCustomers();
    }
    createCustomer(dto) {
        return this.lookupService.createCustomer(dto);
    }
    updateCustomer(id, dto) {
        return this.lookupService.updateCustomer(id, dto);
    }
    deleteCustomer(id) {
        return this.lookupService.deleteCustomer(id);
    }
    getPrinters() {
        return this.lookupService.getPrinters();
    }
    createPrinter(dto) {
        return this.lookupService.createPrinter(dto);
    }
    updatePrinter(id, dto) {
        return this.lookupService.updatePrinter(id, dto);
    }
    deletePrinter(id) {
        return this.lookupService.deletePrinter(id);
    }
};
exports.LookupController = LookupController;
__decorate([
    (0, common_1.Get)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all products' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Post)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new product' }),
    (0, swagger_1.ApiBody)({ type: createProductDto_1.CreateProductDto }),
    (0, swagger_1.ApiResponse)({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [createProductDto_1.CreateProductDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Patch)('products/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a product' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiBody)({ type: updateProductDto_1.UpdateProductDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, updateProductDto_1.UpdateProductDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a product' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)('transporters'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all transporters' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getTransporters", null);
__decorate([
    (0, common_1.Post)('transporters'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a transporter' }),
    (0, swagger_1.ApiBody)({ type: createTransporterDto_1.CreateTransporterDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [createTransporterDto_1.CreateTransporterDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createTransporter", null);
__decorate([
    (0, common_1.Patch)('transporters/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a transporter' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiBody)({ type: updateTransporterDto_1.UpdateTransporterDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, updateTransporterDto_1.UpdateTransporterDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateTransporter", null);
__decorate([
    (0, common_1.Delete)('transporters/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a transporter' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deleteTransporter", null);
__decorate([
    (0, common_1.Get)('plant-codes'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all plant codes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getPlantCodes", null);
__decorate([
    (0, common_1.Post)('plant-codes'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a plant code' }),
    (0, swagger_1.ApiBody)({ type: createPlantCodeDto_1.CreatePlantCodeDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [createPlantCodeDto_1.CreatePlantCodeDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createPlantCode", null);
__decorate([
    (0, common_1.Patch)('plant-codes/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a plant code' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiBody)({ type: updatePlantCodeDto_1.UpdatePlantCodeDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, updatePlantCodeDto_1.UpdatePlantCodeDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updatePlantCode", null);
__decorate([
    (0, common_1.Delete)('plant-codes/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a plant code' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deletePlantCode", null);
__decorate([
    (0, common_1.Get)('sales-zones'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all sales zones' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getSalesZones", null);
__decorate([
    (0, common_1.Post)('sales-zones'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a sales zone' }),
    (0, swagger_1.ApiBody)({ type: createSalesZoneDto_1.CreateSalesZoneDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [createSalesZoneDto_1.CreateSalesZoneDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createSalesZone", null);
__decorate([
    (0, common_1.Patch)('sales-zones/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a sales zone' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiBody)({ type: updateSalesZoneDto_1.UpdateSalesZoneDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, updateSalesZoneDto_1.UpdateSalesZoneDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateSalesZone", null);
__decorate([
    (0, common_1.Delete)('sales-zones/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a sales zone' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deleteSalesZone", null);
__decorate([
    (0, common_1.Get)('pack-configs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all pack configs' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getPackConfigs", null);
__decorate([
    (0, common_1.Post)('pack-configs'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a pack config' }),
    (0, swagger_1.ApiBody)({ type: createPackConfigDto_1.CreatePackConfigDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [createPackConfigDto_1.CreatePackConfigDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createPackConfig", null);
__decorate([
    (0, common_1.Patch)('pack-configs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a pack config' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiBody)({ type: updatePackConfigDto_1.UpdatePackConfigDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, updatePackConfigDto_1.UpdatePackConfigDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updatePackConfig", null);
__decorate([
    (0, common_1.Delete)('pack-configs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a pack config' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deletePackConfig", null);
__decorate([
    (0, common_1.Get)('customers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all customers' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Post)('customers'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a customer' }),
    (0, swagger_1.ApiBody)({ type: createCustomerDto_1.CreateCustomerDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [createCustomerDto_1.CreateCustomerDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Patch)('customers/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a customer' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiBody)({ type: updateCustomerDto_1.UpdateCustomerDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, updateCustomerDto_1.UpdateCustomerDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Delete)('customers/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a customer' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "deleteCustomer", null);
__decorate([
    (0, common_1.Get)('printers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all printers' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getPrinters", null);
__decorate([
    (0, common_1.Post)('printers'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a printer' }),
    (0, swagger_1.ApiBody)({ type: createPrinterDto_1.CreatePrinterDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [createPrinterDto_1.CreatePrinterDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "createPrinter", null);
__decorate([
    (0, common_1.Patch)('printers/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a printer' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    (0, swagger_1.ApiBody)({ type: updatePrinterDto_1.UpdatePrinterDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, updatePrinterDto_1.UpdatePrinterDto]),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "updatePrinter", null);
__decorate([
    (0, common_1.Delete)('printers/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a printer' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
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