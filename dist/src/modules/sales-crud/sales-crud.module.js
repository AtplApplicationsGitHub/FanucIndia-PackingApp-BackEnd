"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesCrudModule = void 0;
const common_1 = require("@nestjs/common");
const sales_crud_controller_1 = require("./sales-crud.controller");
const sales_crud_service_1 = require("./sales-crud.service");
const prisma_service_1 = require("../../prisma.service");
let SalesCrudModule = class SalesCrudModule {
};
exports.SalesCrudModule = SalesCrudModule;
exports.SalesCrudModule = SalesCrudModule = __decorate([
    (0, common_1.Module)({
        controllers: [sales_crud_controller_1.SalesCrudController],
        providers: [sales_crud_service_1.SalesCrudService, prisma_service_1.PrismaService],
        exports: [sales_crud_service_1.SalesCrudService],
    })
], SalesCrudModule);
//# sourceMappingURL=sales-crud.module.js.map