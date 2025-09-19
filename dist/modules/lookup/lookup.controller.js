"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LookupController", {
    enumerable: true,
    get: function() {
        return LookupController;
    }
});
const _common = require("@nestjs/common");
const _lookupservice = require("./lookup.service");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _swagger = require("@nestjs/swagger");
const _createProductDto = require("./dto/createProductDto");
const _updateProductDto = require("./dto/updateProductDto");
const _createTransporterDto = require("./dto/createTransporterDto");
const _updateTransporterDto = require("./dto/updateTransporterDto");
const _createPlantCodeDto = require("./dto/createPlantCodeDto");
const _updatePlantCodeDto = require("./dto/updatePlantCodeDto");
const _createSalesZoneDto = require("./dto/createSalesZoneDto");
const _updateSalesZoneDto = require("./dto/updateSalesZoneDto");
const _createPackConfigDto = require("./dto/createPackConfigDto");
const _updatePackConfigDto = require("./dto/updatePackConfigDto");
const _createCustomerDto = require("./dto/createCustomerDto");
const _updateCustomerDto = require("./dto/updateCustomerDto");
const _createPrinterDto = require("./dto/createPrinterDto");
const _updatePrinterDto = require("./dto/updatePrinterDto");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let LookupController = class LookupController {
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
    constructor(lookupService){
        this.lookupService = lookupService;
    }
};
_ts_decorate([
    (0, _common.Get)('products'),
    (0, _swagger.ApiOperation)({
        summary: 'Get all products'
    }),
    (0, _swagger.ApiResponse)({
        status: 200
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "getProducts", null);
_ts_decorate([
    (0, _common.Post)('products'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new product'
    }),
    (0, _swagger.ApiBody)({
        type: _createProductDto.CreateProductDto
    }),
    (0, _swagger.ApiResponse)({
        status: 201
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createProductDto.CreateProductDto === "undefined" ? Object : _createProductDto.CreateProductDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "createProduct", null);
_ts_decorate([
    (0, _common.Patch)('products/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a product'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _updateProductDto.UpdateProductDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updateProductDto.UpdateProductDto === "undefined" ? Object : _updateProductDto.UpdateProductDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "updateProduct", null);
_ts_decorate([
    (0, _common.Delete)('products/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a product'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "deleteProduct", null);
_ts_decorate([
    (0, _common.Get)('transporters'),
    (0, _swagger.ApiOperation)({
        summary: 'Get all transporters'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "getTransporters", null);
_ts_decorate([
    (0, _common.Post)('transporters'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a transporter'
    }),
    (0, _swagger.ApiBody)({
        type: _createTransporterDto.CreateTransporterDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createTransporterDto.CreateTransporterDto === "undefined" ? Object : _createTransporterDto.CreateTransporterDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "createTransporter", null);
_ts_decorate([
    (0, _common.Patch)('transporters/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a transporter'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _updateTransporterDto.UpdateTransporterDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updateTransporterDto.UpdateTransporterDto === "undefined" ? Object : _updateTransporterDto.UpdateTransporterDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "updateTransporter", null);
_ts_decorate([
    (0, _common.Delete)('transporters/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a transporter'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "deleteTransporter", null);
_ts_decorate([
    (0, _common.Get)('plant-codes'),
    (0, _swagger.ApiOperation)({
        summary: 'Get all plant codes'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "getPlantCodes", null);
_ts_decorate([
    (0, _common.Post)('plant-codes'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a plant code'
    }),
    (0, _swagger.ApiBody)({
        type: _createPlantCodeDto.CreatePlantCodeDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createPlantCodeDto.CreatePlantCodeDto === "undefined" ? Object : _createPlantCodeDto.CreatePlantCodeDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "createPlantCode", null);
_ts_decorate([
    (0, _common.Patch)('plant-codes/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a plant code'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _updatePlantCodeDto.UpdatePlantCodeDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updatePlantCodeDto.UpdatePlantCodeDto === "undefined" ? Object : _updatePlantCodeDto.UpdatePlantCodeDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "updatePlantCode", null);
_ts_decorate([
    (0, _common.Delete)('plant-codes/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a plant code'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "deletePlantCode", null);
_ts_decorate([
    (0, _common.Get)('sales-zones'),
    (0, _swagger.ApiOperation)({
        summary: 'Get all sales zones'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "getSalesZones", null);
_ts_decorate([
    (0, _common.Post)('sales-zones'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a sales zone'
    }),
    (0, _swagger.ApiBody)({
        type: _createSalesZoneDto.CreateSalesZoneDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createSalesZoneDto.CreateSalesZoneDto === "undefined" ? Object : _createSalesZoneDto.CreateSalesZoneDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "createSalesZone", null);
_ts_decorate([
    (0, _common.Patch)('sales-zones/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a sales zone'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _updateSalesZoneDto.UpdateSalesZoneDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updateSalesZoneDto.UpdateSalesZoneDto === "undefined" ? Object : _updateSalesZoneDto.UpdateSalesZoneDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "updateSalesZone", null);
_ts_decorate([
    (0, _common.Delete)('sales-zones/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a sales zone'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "deleteSalesZone", null);
_ts_decorate([
    (0, _common.Get)('pack-configs'),
    (0, _swagger.ApiOperation)({
        summary: 'Get all pack configs'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "getPackConfigs", null);
_ts_decorate([
    (0, _common.Post)('pack-configs'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a pack config'
    }),
    (0, _swagger.ApiBody)({
        type: _createPackConfigDto.CreatePackConfigDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createPackConfigDto.CreatePackConfigDto === "undefined" ? Object : _createPackConfigDto.CreatePackConfigDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "createPackConfig", null);
_ts_decorate([
    (0, _common.Patch)('pack-configs/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a pack config'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _updatePackConfigDto.UpdatePackConfigDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updatePackConfigDto.UpdatePackConfigDto === "undefined" ? Object : _updatePackConfigDto.UpdatePackConfigDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "updatePackConfig", null);
_ts_decorate([
    (0, _common.Delete)('pack-configs/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a pack config'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "deletePackConfig", null);
_ts_decorate([
    (0, _common.Get)('customers'),
    (0, _swagger.ApiOperation)({
        summary: 'Get all customers'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "getCustomers", null);
_ts_decorate([
    (0, _common.Post)('customers'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a customer'
    }),
    (0, _swagger.ApiBody)({
        type: _createCustomerDto.CreateCustomerDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createCustomerDto.CreateCustomerDto === "undefined" ? Object : _createCustomerDto.CreateCustomerDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "createCustomer", null);
_ts_decorate([
    (0, _common.Patch)('customers/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a customer'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _updateCustomerDto.UpdateCustomerDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updateCustomerDto.UpdateCustomerDto === "undefined" ? Object : _updateCustomerDto.UpdateCustomerDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "updateCustomer", null);
_ts_decorate([
    (0, _common.Delete)('customers/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a customer'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "deleteCustomer", null);
_ts_decorate([
    (0, _common.Get)('printers'),
    (0, _swagger.ApiOperation)({
        summary: 'Get all printers'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "getPrinters", null);
_ts_decorate([
    (0, _common.Post)('printers'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a printer'
    }),
    (0, _swagger.ApiBody)({
        type: _createPrinterDto.CreatePrinterDto
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createPrinterDto.CreatePrinterDto === "undefined" ? Object : _createPrinterDto.CreatePrinterDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "createPrinter", null);
_ts_decorate([
    (0, _common.Patch)('printers/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a printer'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _updatePrinterDto.UpdatePrinterDto
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updatePrinterDto.UpdatePrinterDto === "undefined" ? Object : _updatePrinterDto.UpdatePrinterDto
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "updatePrinter", null);
_ts_decorate([
    (0, _common.Delete)('printers/:id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a printer'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], LookupController.prototype, "deletePrinter", null);
LookupController = _ts_decorate([
    (0, _swagger.ApiTags)('Lookup'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('lookup'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _lookupservice.LookupService === "undefined" ? Object : _lookupservice.LookupService
    ])
], LookupController);

//# sourceMappingURL=lookup.controller.js.map