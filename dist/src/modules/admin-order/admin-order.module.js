"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminOrderModule = void 0;
const common_1 = require("@nestjs/common");
const admin_order_controller_1 = require("./admin-order.controller");
const admin_order_service_1 = require("./admin-order.service");
const admin_sales_orders_controller_1 = require("./admin-sales-orders.controller");
let AdminOrderModule = class AdminOrderModule {
};
exports.AdminOrderModule = AdminOrderModule;
exports.AdminOrderModule = AdminOrderModule = __decorate([
    (0, common_1.Module)({
        controllers: [admin_order_controller_1.AdminOrderController, admin_sales_orders_controller_1.AdminSalesOrdersController],
        providers: [admin_order_service_1.AdminOrderService],
        exports: [admin_order_service_1.AdminOrderService],
    })
], AdminOrderModule);
//# sourceMappingURL=admin-order.module.js.map