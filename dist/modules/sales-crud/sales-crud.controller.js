"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesCrudController", {
    enumerable: true,
    get: function() {
        return SalesCrudController;
    }
});
const _common = require("@nestjs/common");
const _salescrudservice = require("./sales-crud.service");
const _createsalescruddto = require("./dto/create-sales-crud.dto");
const _updatesalescruddto = require("./dto/update-sales-crud.dto");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _swagger = require("@nestjs/swagger");
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
let SalesCrudController = class SalesCrudController {
    create(dto, req) {
        return this.service.create(dto, req.user.userId);
    }
    findAll(req, page = '1', limit = '10', search) {
        const pageNumber = Number(page) || 1;
        const pageSize = Number(limit) || 10;
        return this.service.getPaginatedOrders(pageNumber, pageSize, req.user.userId, search);
    }
    findOne(id, req) {
        return this.service.findOne(id, req.user.userId);
    }
    update(id, dto, req) {
        return this.service.update(id, dto, req.user.userId);
    }
    remove(id, req) {
        return this.service.remove(id, req.user.userId);
    }
    constructor(service){
        this.service = service;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new sales order'
    }),
    (0, _swagger.ApiBody)({
        type: _createsalescruddto.CreateSalesCrudDto
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Sales order created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Bad request (validation/business error)'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Forbidden'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Conflict (duplicate order)'
    }),
    (0, _swagger.ApiResponse)({
        status: 500,
        description: 'Internal server error'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createsalescruddto.CreateSalesCrudDto === "undefined" ? Object : _createsalescruddto.CreateSalesCrudDto,
        void 0
    ]),
    _ts_metadata("design:returntype", void 0)
], SalesCrudController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Get paginated sales orders for the user'
    }),
    (0, _swagger.ApiQuery)({
        name: 'page',
        required: false,
        example: 1
    }),
    (0, _swagger.ApiQuery)({
        name: 'limit',
        required: false,
        example: 10
    }),
    (0, _swagger.ApiQuery)({
        name: 'search',
        required: false,
        example: 'SO123'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales orders retrieved'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Forbidden'
    }),
    (0, _swagger.ApiResponse)({
        status: 500,
        description: 'Internal server error'
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Query)('page')),
    _ts_param(2, (0, _common.Query)('limit')),
    _ts_param(3, (0, _common.Query)('search')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], SalesCrudController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Get a specific sales order by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales order found'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Not found or access denied'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Forbidden'
    }),
    (0, _swagger.ApiResponse)({
        status: 500,
        description: 'Internal server error'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        void 0
    ]),
    _ts_metadata("design:returntype", void 0)
], SalesCrudController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a specific sales order by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _updatesalescruddto.UpdateSalesCrudDto
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales order updated'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Bad request (validation/business error)'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Forbidden'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Conflict (unique constraint)'
    }),
    (0, _swagger.ApiResponse)({
        status: 500,
        description: 'Internal server error'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updatesalescruddto.UpdateSalesCrudDto === "undefined" ? Object : _updatesalescruddto.UpdateSalesCrudDto,
        void 0
    ]),
    _ts_metadata("design:returntype", void 0)
], SalesCrudController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a sales order by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales order deleted'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Forbidden'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Not found'
    }),
    (0, _swagger.ApiResponse)({
        status: 500,
        description: 'Internal server error'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        void 0
    ]),
    _ts_metadata("design:returntype", void 0)
], SalesCrudController.prototype, "remove", null);
SalesCrudController = _ts_decorate([
    (0, _swagger.ApiTags)('Sales Orders'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('sales-crud'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _salescrudservice.SalesCrudService === "undefined" ? Object : _salescrudservice.SalesCrudService
    ])
], SalesCrudController);

//# sourceMappingURL=sales-crud.controller.js.map