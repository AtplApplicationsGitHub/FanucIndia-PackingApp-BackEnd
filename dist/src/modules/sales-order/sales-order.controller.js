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
exports.SalesOrderController = void 0;
const common_1 = require("@nestjs/common");
const sales_order_service_1 = require("./sales-order.service");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
let SalesOrderController = class SalesOrderController {
    salesOrderService;
    constructor(salesOrderService) {
        this.salesOrderService = salesOrderService;
    }
    async downloadTemplate(res) {
        await this.salesOrderService.generateBulkTemplate(res);
    }
    async bulkImport(file, req) {
        if (!file) {
            throw new common_1.HttpException('No file uploaded', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.salesOrderService.importBulkOrders(file.buffer, req.user['userId']);
    }
};
exports.SalesOrderController = SalesOrderController;
__decorate([
    (0, common_1.Get)('template'),
    (0, roles_decorator_1.Roles)('sales'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesOrderController.prototype, "downloadTemplate", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, roles_decorator_1.Roles)('sales'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SalesOrderController.prototype, "bulkImport", null);
exports.SalesOrderController = SalesOrderController = __decorate([
    (0, swagger_1.ApiTags)('Sales Order Bulk Import'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('sales-orders'),
    __metadata("design:paramtypes", [sales_order_service_1.SalesOrderService])
], SalesOrderController);
//# sourceMappingURL=sales-order.controller.js.map