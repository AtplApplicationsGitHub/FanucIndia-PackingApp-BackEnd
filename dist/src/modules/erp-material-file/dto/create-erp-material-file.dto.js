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
exports.CreateErpMaterialFileDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateErpMaterialFileDto {
    saleOrderNumber;
    fileName;
    description;
}
exports.CreateErpMaterialFileDto = CreateErpMaterialFileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sales order number this file belongs to (nullable in DB)',
        maxLength: 500,
        example: 'SO-2025-000123',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", Object)
], CreateErpMaterialFileDto.prototype, "saleOrderNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Stored file name (unique with saleOrderNumber)',
        maxLength: 500,
        example: 'packing_list_SO-2025-000123.pdf',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateErpMaterialFileDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Optional description/notes',
        maxLength: 2000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", Object)
], CreateErpMaterialFileDto.prototype, "description", void 0);
//# sourceMappingURL=create-erp-material-file.dto.js.map