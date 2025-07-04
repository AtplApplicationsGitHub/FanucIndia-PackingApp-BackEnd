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
    getTransporters() {
        return this.lookupService.getTransporters();
    }
    getPlantCodes() {
        return this.lookupService.getPlantCodes();
    }
    getSalesZones() {
        return this.lookupService.getSalesZones();
    }
    getPackConfigs() {
        return this.lookupService.getPackConfigs();
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
    (0, common_1.Get)('transporters'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getTransporters", null);
__decorate([
    (0, common_1.Get)('plant-codes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getPlantCodes", null);
__decorate([
    (0, common_1.Get)('sales-zones'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getSalesZones", null);
__decorate([
    (0, common_1.Get)('pack-configs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LookupController.prototype, "getPackConfigs", null);
exports.LookupController = LookupController = __decorate([
    (0, swagger_1.ApiTags)('Lookup'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('lookup'),
    __metadata("design:paramtypes", [lookup_service_1.LookupService])
], LookupController);
//# sourceMappingURL=lookup.controller.js.map