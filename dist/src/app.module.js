"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const sales_order_module_1 = require("./modules/sales-order/sales-order.module");
const auth_module_1 = require("./modules/auth/auth.module");
const lookup_module_1 = require("./modules/lookup/lookup.module");
const sales_crud_module_1 = require("./modules/sales-crud/sales-crud.module");
const admin_order_module_1 = require("./modules/admin-order/admin-order.module");
const prisma_module_1 = require("./prisma.module");
const user_module_1 = require("./modules/user/user.module");
const erp_material_data_module_1 = require("./modules/erp-material-data/erp-material-data.module");
const erp_material_file_module_1 = require("./modules/erp-material-file/erp-material-file.module");
const sftp_module_1 = require("./modules/sftp/sftp.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule.forRoot({ isGlobal: true }), prisma_module_1.PrismaModule, sales_order_module_1.SalesOrderModule, auth_module_1.AuthModule, lookup_module_1.LookupModule, sales_crud_module_1.SalesCrudModule, admin_order_module_1.AdminOrderModule, user_module_1.UserModule, erp_material_data_module_1.ErpMaterialDataModule, erp_material_file_module_1.ErpMaterialFileModule, sftp_module_1.SftpModule,],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map