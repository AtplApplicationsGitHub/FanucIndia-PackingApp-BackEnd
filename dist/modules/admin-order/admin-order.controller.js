"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminOrderController", {
    enumerable: true,
    get: function() {
        return AdminOrderController;
    }
});
const _common = require("@nestjs/common");
const _adminorderservice = require("./admin-order.service");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _updateadminorderdto = require("./dto/update-admin-order.dto");
const _swagger = require("@nestjs/swagger");
const _authrequesttype = require("../auth/types/auth-request.type");
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
let AdminOrderController = class AdminOrderController {
    findAll(query) {
        return this.service.findAll(query);
    }
    update(id, dto, req) {
        return this.service.update(id, dto, req.user);
    }
    async remove(id) {
        return this.service.remove(id);
    }
    constructor(service){
        this.service = service;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _rolesdecorator.Roles)('ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: 'Get all sales orders (admin only)'
    }),
    (0, _swagger.ApiQuery)({
        name: 'status',
        required: false,
        type: String,
        description: 'Filter by status'
    }),
    (0, _swagger.ApiQuery)({
        name: 'product',
        required: false,
        type: String,
        description: 'Filter by product ID or name'
    }),
    (0, _swagger.ApiQuery)({
        name: 'date',
        required: false,
        type: String,
        description: 'Filter by delivery date (YYYY-MM-DD)'
    }),
    (0, _swagger.ApiQuery)({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number for pagination'
    }),
    (0, _swagger.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Results per page'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'List of sales orders returned successfully'
    }),
    _ts_param(0, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], AdminOrderController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a specific sales order (admin and user roles)'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number,
        description: 'ID of the sales order to update'
    }),
    (0, _swagger.ApiBody)({
        type: _updateadminorderdto.UpdateAdminOrderDto
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales order updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Sales order not found'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updateadminorderdto.UpdateAdminOrderDto === "undefined" ? Object : _updateadminorderdto.UpdateAdminOrderDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], AdminOrderController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _rolesdecorator.Roles)('ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a specific sales order (admin only)'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number,
        description: 'ID of the sales order to delete'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales order deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Sales order not found'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AdminOrderController.prototype, "remove", null);
AdminOrderController = _ts_decorate([
    (0, _swagger.ApiTags)('Admin Orders'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('admin/sales-orders'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _adminorderservice.AdminOrderService === "undefined" ? Object : _adminorderservice.AdminOrderService
    ])
], AdminOrderController);

//# sourceMappingURL=admin-order.controller.js.map