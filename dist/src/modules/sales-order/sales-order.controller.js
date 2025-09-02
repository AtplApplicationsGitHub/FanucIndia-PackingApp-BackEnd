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
const buffer_1 = require("buffer");
let SalesOrderController = class SalesOrderController {
    salesOrderService;
    constructor(salesOrderService) {
        this.salesOrderService = salesOrderService;
    }
    async downloadTemplate(res) {
        try {
            await this.salesOrderService.generateBulkTemplate(res);
        }
        catch (err) {
            const status = err instanceof common_1.HttpException ? err.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            throw new common_1.HttpException(err.message || 'Failed to download template', status);
        }
    }
    async bulkImport(file, req) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const buf = buffer_1.Buffer.isBuffer(file.buffer)
            ? file.buffer
            : buffer_1.Buffer.from(file.buffer);
        try {
            return await this.salesOrderService.importBulkOrders(buf, req.user.userId);
        }
        catch (err) {
            if (err.status && err.response) {
                throw err;
            }
            throw new common_1.HttpException(err.message || 'Failed to import sales orders', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.SalesOrderController = SalesOrderController;
__decorate([
    (0, common_1.Get)('template'),
    (0, roles_decorator_1.Roles)('SALES'),
    (0, swagger_1.ApiOperation)({ summary: 'Download sales order Excel template' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Excel file downloaded' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Failed to generate or send template' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesOrderController.prototype, "downloadTemplate", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, roles_decorator_1.Roles)('SALES'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiOperation)({ summary: 'Import bulk sales orders via Excel file' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Sales orders imported successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'No file uploaded or invalid format' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Duplicate orders detected' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Failed to import sales orders' }),
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