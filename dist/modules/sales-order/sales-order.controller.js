"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesOrderController", {
    enumerable: true,
    get: function() {
        return SalesOrderController;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _salesorderservice = require("./sales-order.service");
const _platformexpress = require("@nestjs/platform-express");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _swagger = require("@nestjs/swagger");
const _authrequesttype = require("../auth/types/auth-request.type");
const _buffer = require("buffer");
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
let SalesOrderController = class SalesOrderController {
    async downloadTemplate(res) {
        try {
            await this.salesOrderService.generateBulkTemplate(res);
        } catch (err) {
            const status = err instanceof _common.HttpException ? err.getStatus() : _common.HttpStatus.INTERNAL_SERVER_ERROR;
            throw new _common.HttpException(err.message || 'Failed to download template', status);
        }
    }
    async bulkImport(file, req) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded');
        }
        const buf = _buffer.Buffer.isBuffer(file.buffer) ? file.buffer : _buffer.Buffer.from(file.buffer);
        try {
            return await this.salesOrderService.importBulkOrders(buf, req.user.userId);
        } catch (err) {
            if (err.status && err.response) {
                throw err;
            }
            throw new _common.HttpException(err.message || 'Failed to import sales orders', _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    constructor(salesOrderService){
        this.salesOrderService = salesOrderService;
    }
};
_ts_decorate([
    (0, _common.Get)('template'),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Download sales order Excel template'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Excel file downloaded'
    }),
    (0, _swagger.ApiResponse)({
        status: 500,
        description: 'Failed to generate or send template'
    }),
    _ts_param(0, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesOrderController.prototype, "downloadTemplate", null);
_ts_decorate([
    (0, _common.Post)('import'),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file')),
    (0, _swagger.ApiOperation)({
        summary: 'Import bulk sales orders via Excel file'
    }),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    (0, _swagger.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Sales orders imported successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'No file uploaded or invalid format'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Duplicate orders detected'
    }),
    (0, _swagger.ApiResponse)({
        status: 500,
        description: 'Failed to import sales orders'
    }),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesOrderController.prototype, "bulkImport", null);
SalesOrderController = _ts_decorate([
    (0, _swagger.ApiTags)('Sales Order Bulk Import'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('sales-orders'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _salesorderservice.SalesOrderService === "undefined" ? Object : _salesorderservice.SalesOrderService
    ])
], SalesOrderController);

//# sourceMappingURL=sales-order.controller.js.map