"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateSalesCrudDto", {
    enumerable: true,
    get: function() {
        return CreateSalesCrudDto;
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
let CreateSalesCrudDto = class CreateSalesCrudDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1,
        description: 'Product ID (lookup)'
    }),
    (0, _classvalidator.IsInt)({
        message: 'Product ID must be an integer.'
    }),
    _ts_metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "productId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'SO12345',
        description: 'Sale Order Number'
    }),
    (0, _classvalidator.IsString)({
        message: 'Sale Order Number must be a string.'
    }),
    _ts_metadata("design:type", String)
], CreateSalesCrudDto.prototype, "saleOrderNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'OUT123',
        description: 'Outbound Delivery'
    }),
    (0, _classvalidator.IsString)({
        message: 'Outbound Delivery must be a string.'
    }),
    _ts_metadata("design:type", String)
], CreateSalesCrudDto.prototype, "outboundDelivery", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'TRF456',
        description: 'Transfer Order'
    }),
    (0, _classvalidator.IsString)({
        message: 'Transfer Order must be a string.'
    }),
    _ts_metadata("design:type", String)
], CreateSalesCrudDto.prototype, "transferOrder", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '2025-07-02',
        description: 'Delivery Date (YYYY-MM-DD)'
    }),
    (0, _classvalidator.IsDateString)({}, {
        message: 'Delivery Date must be a valid ISO date string (YYYY-MM-DD).'
    }),
    _ts_metadata("design:type", String)
], CreateSalesCrudDto.prototype, "deliveryDate", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1,
        description: 'Transporter ID (lookup)'
    }),
    (0, _classvalidator.IsInt)({
        message: 'Transporter ID must be an integer.'
    }),
    _ts_metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "transporterId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1,
        description: 'Plant Code ID (lookup)'
    }),
    (0, _classvalidator.IsInt)({
        message: 'Plant Code ID must be an integer.'
    }),
    _ts_metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "plantCodeId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: true,
        description: 'Payment Clearance (true/false)'
    }),
    (0, _classvalidator.IsBoolean)({
        message: 'Payment Clearance must be a boolean.'
    }),
    _ts_metadata("design:type", Boolean)
], CreateSalesCrudDto.prototype, "paymentClearance", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1,
        description: 'Sales Zone ID (lookup)'
    }),
    (0, _classvalidator.IsInt)({
        message: 'Sales Zone ID must be an integer.'
    }),
    _ts_metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "salesZoneId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1,
        description: 'Packing Config ID (lookup)'
    }),
    (0, _classvalidator.IsInt)({
        message: 'Packing Config ID must be an integer.'
    }),
    _ts_metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "packConfigId", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1,
        description: 'Customer ID (lookup)'
    }),
    (0, _classvalidator.IsInt)({
        message: 'Customer ID must be an integer.'
    }),
    _ts_metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "customerId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        example: 'Handle with care',
        description: 'Special Remarks (optional)'
    }),
    (0, _classvalidator.IsString)({
        message: 'Special Remarks must be a string.'
    }),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", String)
], CreateSalesCrudDto.prototype, "specialRemarks", void 0);

//# sourceMappingURL=create-sales-crud.dto.js.map