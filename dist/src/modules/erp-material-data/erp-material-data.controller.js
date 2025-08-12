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
let ErpMaterialDataController = class ErpMaterialDataController {
    erpMaterialDataService;
    constructor(erpMaterialDataService) {
        this.erpMaterialDataService = erpMaterialDataService;
    }
    getMaterialsByOrderId(orderId) {
        return this.erpMaterialDataService.getMaterialsByOrderId(orderId);
    }
    incrementIssueStage(orderId, body) {
        return this.erpMaterialDataService.incrementIssueStage(orderId, body.materialCode);
    }
    updateIssueStage(orderId, body) {
        return this.erpMaterialDataService.updateIssueStage(orderId, body.materialCode, body.issueStage);
    }
    incrementPackingStage(orderId, body) {
        return this.erpMaterialDataService.incrementPackingStage(orderId, body.materialCode);
    }
    updatePackingStage(orderId, body) {
        return this.erpMaterialDataService.updatePackingStage(orderId, body.materialCode, body.packingStage);
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
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
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
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Cannot exceed the Required_Qty value.',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order or Material not found.' }),
    (0, common_1.Post)('increment-issue-stage'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, increment_issue_stage_dto_1.IncrementIssueStageDto]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "incrementIssueStage", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update issue stage for a material code (inline edit)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', type: Number, description: 'Sales Order ID' }),
    (0, swagger_1.ApiBody)({ type: update_issue_stage_dto_1.UpdateIssueStageDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Issue stage updated successfully.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Cannot exceed the Required_Qty value.',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order or Material not found.' }),
    (0, common_1.Patch)('update-issue-stage'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_issue_stage_dto_1.UpdateIssueStageDto]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "updateIssueStage", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Increment packing stage for a material code' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', type: Number, description: 'Sales Order ID' }),
    (0, swagger_1.ApiBody)({ type: increment_packing_stage_dto_1.IncrementPackingStageDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Packing stage incremented successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot exceed the min(Required_Qty, Issue_stage) cap.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order or Material not found.' }),
    (0, common_1.Post)('increment-packing-stage'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, increment_packing_stage_dto_1.IncrementPackingStageDto]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "incrementPackingStage", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Update packing stage for a material code (inline edit)' }),
    (0, swagger_1.ApiParam)({ name: 'orderId', type: Number, description: 'Sales Order ID' }),
    (0, swagger_1.ApiBody)({ type: update_packing_stage_dto_1.UpdatePackingStageDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Packing stage updated successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot exceed the min(Required_Qty, Issue_stage) cap.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order or Material not found.' }),
    (0, common_1.Patch)('update-packing-stage'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_packing_stage_dto_1.UpdatePackingStageDto]),
    __metadata("design:returntype", void 0)
], ErpMaterialDataController.prototype, "updatePackingStage", null);
exports.ErpMaterialDataController = ErpMaterialDataController = __decorate([
    (0, swagger_1.ApiTags)('ERP Material Data'),
    (0, common_1.Controller)('admin/orders/:orderId/erp-materials'),
    __metadata("design:paramtypes", [erp_material_data_service_1.ErpMaterialDataService])
], ErpMaterialDataController);
//# sourceMappingURL=erp-material-data.controller.js.map