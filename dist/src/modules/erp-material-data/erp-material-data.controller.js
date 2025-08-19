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
exports.ErpMaterialDataController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const erp_material_data_service_1 = require("./erp-material-data.service");
const update_issue_stage_dto_1 = require("./dto/update-issue-stage.dto");
const increment_issue_stage_dto_1 = require("./dto/increment-issue-stage.dto");
const update_packing_stage_dto_1 = require("./dto/update-packing-stage.dto");
const increment_packing_stage_dto_1 = require("./dto/increment-packing-stage.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let ErpMaterialDataController = class ErpMaterialDataController {
    erpMaterialDataService;
    constructor(erpMaterialDataService) {
        this.erpMaterialDataService = erpMaterialDataService;
    }
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
};
exports.ErpMaterialDataController = ErpMaterialDataController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Get ERP materials for a sales order' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', type: Number, description: 'Sales Order ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of ERP materials for the order.',
    }),
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'user'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "getMaterialsByOrderId", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Increment issue stage for a material code' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', type: Number, description: 'Sales Order ID' }),
    (0, swagger_1.ApiBody)({ type: increment_issue_stage_dto_1.IncrementIssueStageDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Issue stage incremented successfully.',
    }),
    (0, common_1.Post)('increment-issue-stage'),
    (0, roles_decorator_1.Roles)('admin', 'user'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, increment_issue_stage_dto_1.IncrementIssueStageDto, Object]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "incrementIssueStage", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update issue stage for a material code (inline edit)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', type: Number, description: 'Sales Order ID' }),
    (0, swagger_1.ApiBody)({ type: update_issue_stage_dto_1.UpdateIssueStageDto }),
    (0, common_1.Patch)('update-issue-stage'),
    (0, roles_decorator_1.Roles)('admin', 'user'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_issue_stage_dto_1.UpdateIssueStageDto, Object]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "updateIssueStage", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Increment packing stage for a material code' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', type: Number, description: 'Sales Order ID' }),
    (0, swagger_1.ApiBody)({ type: increment_packing_stage_dto_1.IncrementPackingStageDto }),
    (0, common_1.Post)('increment-packing-stage'),
    (0, roles_decorator_1.Roles)('admin', 'user'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, increment_packing_stage_dto_1.IncrementPackingStageDto, Object]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "incrementPackingStage", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update packing stage for a material code (inline edit)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', type: Number, description: 'Sales Order ID' }),
    (0, swagger_1.ApiBody)({ type: update_packing_stage_dto_1.UpdatePackingStageDto }),
    (0, common_1.Patch)('update-packing-stage'),
    (0, roles_decorator_1.Roles)('admin', 'user'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_packing_stage_dto_1.UpdatePackingStageDto, Object]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "updatePackingStage", null);
exports.ErpMaterialDataController = ErpMaterialDataController = __decorate([
    (0, swagger_1.ApiTags)('ERP Material Data'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('admin/orders/:orderId/erp-materials'),
    __metadata("design:paramtypes", [erp_material_data_service_1.ErpMaterialDataService])
], ErpMaterialDataController);
//# sourceMappingURL=erp-material-data.controller.js.map