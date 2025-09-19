"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateAdminOrderDto", {
    enumerable: true,
    get: function() {
        return UpdateAdminOrderDto;
    }
});
const _classvalidator = require("class-validator");
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
let UpdateAdminOrderDto = class UpdateAdminOrderDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'R105',
        description: 'Order status'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateAdminOrderDto.prototype, "status", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 1,
        description: 'Priority value'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    _ts_metadata("design:type", Number)
], UpdateAdminOrderDto.prototype, "priority", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 1,
        description: 'Assigned User ID'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    _ts_metadata("design:type", Number)
], UpdateAdminOrderDto.prototype, "assignedUserId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 1,
        description: 'Customer ID (lookup)'
    }),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", Number)
], UpdateAdminOrderDto.prototype, "customerId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'SO123456',
        description: 'Sale Order Number'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateAdminOrderDto.prototype, "saleOrderNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'OB7890',
        description: 'Outbound Delivery'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateAdminOrderDto.prototype, "outboundDelivery", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'TR999',
        description: 'Transfer Order'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateAdminOrderDto.prototype, "transferOrder", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: '2025-07-18',
        description: 'Delivery Date (ISO)'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateAdminOrderDto.prototype, "deliveryDate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Delivery is urgent',
        description: 'Special Remarks'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateAdminOrderDto.prototype, "specialRemarks", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 1,
        description: 'Product ID'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    _ts_metadata("design:type", Number)
], UpdateAdminOrderDto.prototype, "productId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 2,
        description: 'Transporter ID'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    _ts_metadata("design:type", Number)
], UpdateAdminOrderDto.prototype, "transporterId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 3,
        description: 'Plant Code ID'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    _ts_metadata("design:type", Number)
], UpdateAdminOrderDto.prototype, "plantCodeId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: true,
        description: 'Payment Clearance'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateAdminOrderDto.prototype, "paymentClearance", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 4,
        description: 'Sales Zone ID'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    _ts_metadata("design:type", Number)
], UpdateAdminOrderDto.prototype, "salesZoneId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 5,
        description: 'Pack Config ID'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsInt)(),
    _ts_metadata("design:type", Number)
], UpdateAdminOrderDto.prototype, "packConfigId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Warehouse A, Rack 5',
        description: 'Finished Goods Location'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateAdminOrderDto.prototype, "fgLocation", void 0);

//# sourceMappingURL=update-admin-order.dto.js.map