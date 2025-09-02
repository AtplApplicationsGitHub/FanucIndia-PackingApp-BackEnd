"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpMaterialImporterModule = void 0;
const common_1 = require("@nestjs/common");
const erp_material_importer_service_1 = require("./erp-material-importer.service");
const erp_material_importer_controller_1 = require("./erp-material-importer.controller");
const prisma_service_1 = require("../../prisma.service");
let ErpMaterialImporterModule = class ErpMaterialImporterModule {
};
exports.ErpMaterialImporterModule = ErpMaterialImporterModule;
exports.ErpMaterialImporterModule = ErpMaterialImporterModule = __decorate([
    (0, common_1.Module)({
        controllers: [erp_material_importer_controller_1.ErpMaterialImporterController],
        providers: [erp_material_importer_service_1.ErpMaterialImporterService, prisma_service_1.PrismaService],
        exports: [erp_material_importer_service_1.ErpMaterialImporterService],
    })
], ErpMaterialImporterModule);
//# sourceMappingURL=erp-material-importer.module.js.map