"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpMaterialDataModule = void 0;
const common_1 = require("@nestjs/common");
const erp_material_data_service_1 = require("./erp-material-data.service");
const erp_material_data_controller_1 = require("./erp-material-data.controller");
const prisma_service_1 = require("../../prisma.service");
let ErpMaterialDataModule = class ErpMaterialDataModule {
};
exports.ErpMaterialDataModule = ErpMaterialDataModule;
exports.ErpMaterialDataModule = ErpMaterialDataModule = __decorate([
    (0, common_1.Module)({
        controllers: [erp_material_data_controller_1.ErpMaterialDataController],
        providers: [erp_material_data_service_1.ErpMaterialDataService, prisma_service_1.PrismaService],
        exports: [erp_material_data_service_1.ErpMaterialDataService],
    })
], ErpMaterialDataModule);
//# sourceMappingURL=erp-material-data.module.js.map