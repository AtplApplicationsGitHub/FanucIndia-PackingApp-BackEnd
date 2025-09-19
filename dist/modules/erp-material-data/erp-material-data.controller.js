"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ErpMaterialDataController", {
    enumerable: true,
    get: function() {
        return ErpMaterialDataController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _erpmaterialdataservice = require("./erp-material-data.service");
const _updateissuestagedto = require("./dto/update-issue-stage.dto");
const _incrementissuestagedto = require("./dto/increment-issue-stage.dto");
const _updatepackingstagedto = require("./dto/update-packing-stage.dto");
const _incrementpackingstagedto = require("./dto/increment-packing-stage.dto");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
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
let ErpMaterialDataController = class ErpMaterialDataController {
    getMaterialsByOrderId(orderId, req) {
        const { userId, role } = req.user;
        return this.erpMaterialDataService.getMaterialsByOrderId(orderId, userId, role);
    }
    incrementIssueStage(orderId, body, req) {
        const { userId, role } = req.user;
        return this.erpMaterialDataService.incrementIssueStage(orderId, body.materialCode, userId, role);
    }
    updateIssueStage(orderId, body, req) {
        const { userId, role } = req.user;
        return this.erpMaterialDataService.updateIssueStage(orderId, body.materialCode, body.issueStage, userId, role);
    }
    incrementPackingStage(orderId, body, req) {
        const { userId, role } = req.user;
        return this.erpMaterialDataService.incrementPackingStage(orderId, body.materialCode, userId, role);
    }
    updatePackingStage(orderId, body, req) {
        const { userId, role } = req.user;
        return this.erpMaterialDataService.updatePackingStage(orderId, body.materialCode, body.packingStage, userId, role);
    }
    constructor(erpMaterialDataService){
        this.erpMaterialDataService = erpMaterialDataService;
    }
};
_ts_decorate([
    (0, _swagger.ApiOperation)({
        summary: 'Get ERP materials for a sales order'
    }),
    (0, _swagger.ApiParam)({
        name: 'orderId',
        type: Number,
        description: 'Sales Order ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'List of ERP materials for the order.'
    }),
    (0, _common.Get)(),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('orderId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "getMaterialsByOrderId", null);
_ts_decorate([
    (0, _swagger.ApiOperation)({
        summary: 'Increment issue stage for a material code'
    }),
    (0, _swagger.ApiParam)({
        name: 'orderId',
        type: Number,
        description: 'Sales Order ID'
    }),
    (0, _swagger.ApiBody)({
        type: _incrementissuestagedto.IncrementIssueStageDto
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Issue stage incremented successfully.'
    }),
    (0, _common.Post)('increment-issue-stage'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('orderId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _incrementissuestagedto.IncrementIssueStageDto === "undefined" ? Object : _incrementissuestagedto.IncrementIssueStageDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "incrementIssueStage", null);
_ts_decorate([
    (0, _swagger.ApiOperation)({
        summary: 'Update issue stage for a material code (inline edit)'
    }),
    (0, _swagger.ApiParam)({
        name: 'orderId',
        type: Number,
        description: 'Sales Order ID'
    }),
    (0, _swagger.ApiBody)({
        type: _updateissuestagedto.UpdateIssueStageDto
    }),
    (0, _common.Patch)('update-issue-stage'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('orderId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updateissuestagedto.UpdateIssueStageDto === "undefined" ? Object : _updateissuestagedto.UpdateIssueStageDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "updateIssueStage", null);
_ts_decorate([
    (0, _swagger.ApiOperation)({
        summary: 'Increment packing stage for a material code'
    }),
    (0, _swagger.ApiParam)({
        name: 'orderId',
        type: Number,
        description: 'Sales Order ID'
    }),
    (0, _swagger.ApiBody)({
        type: _incrementpackingstagedto.IncrementPackingStageDto
    }),
    (0, _common.Post)('increment-packing-stage'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('orderId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _incrementpackingstagedto.IncrementPackingStageDto === "undefined" ? Object : _incrementpackingstagedto.IncrementPackingStageDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "incrementPackingStage", null);
_ts_decorate([
    (0, _swagger.ApiOperation)({
        summary: 'Update packing stage for a material code (inline edit)'
    }),
    (0, _swagger.ApiParam)({
        name: 'orderId',
        type: Number,
        description: 'Sales Order ID'
    }),
    (0, _swagger.ApiBody)({
        type: _updatepackingstagedto.UpdatePackingStageDto
    }),
    (0, _common.Patch)('update-packing-stage'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('orderId', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updatepackingstagedto.UpdatePackingStageDto === "undefined" ? Object : _updatepackingstagedto.UpdatePackingStageDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "updatePackingStage", null);
ErpMaterialDataController = _ts_decorate([
    (0, _swagger.ApiTags)('ERP Material Data'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('admin/orders/:orderId/erp-materials'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _erpmaterialdataservice.ErpMaterialDataService === "undefined" ? Object : _erpmaterialdataservice.ErpMaterialDataService
    ])
], ErpMaterialDataController);

//# sourceMappingURL=erp-material-data.controller.js.map