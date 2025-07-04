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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSalesCrudDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateSalesCrudDto {
    productId;
    saleOrderNumber;
    outboundDelivery;
    transferOrder;
    deliveryDate;
    transporterId;
    plantCodeId;
    paymentClearance;
    salesZoneId;
    packConfigId;
    specialRemarks;
}
exports.CreateSalesCrudDto = CreateSalesCrudDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Product ID (lookup)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SO12345', description: 'Sale Order Number' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalesCrudDto.prototype, "saleOrderNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'OUT123', description: 'Outbound Delivery' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalesCrudDto.prototype, "outboundDelivery", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'TRF456', description: 'Transfer Order' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalesCrudDto.prototype, "transferOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2025-07-02', description: 'Delivery Date (YYYY-MM-DD)' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSalesCrudDto.prototype, "deliveryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Transporter ID (lookup)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "transporterId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Plant Code ID (lookup)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "plantCodeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Payment Clearance (true/false)' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSalesCrudDto.prototype, "paymentClearance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Sales Zone ID (lookup)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "salesZoneId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Packing Config ID (lookup)' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateSalesCrudDto.prototype, "packConfigId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Handle with care', description: 'Special Remarks (optional)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSalesCrudDto.prototype, "specialRemarks", void 0);
//# sourceMappingURL=create-sales-crud.dto.js.map