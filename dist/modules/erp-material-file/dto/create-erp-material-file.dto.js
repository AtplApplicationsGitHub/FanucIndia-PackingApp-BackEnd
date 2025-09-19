"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateErpMaterialFileDto", {
    enumerable: true,
    get: function() {
        return CreateErpMaterialFileDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _classvalidator = require("class-validator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CreateErpMaterialFileDto = class CreateErpMaterialFileDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Sales order number this file belongs to (nullable in DB)',
        maxLength: 500,
        example: 'SO-2025-000123'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", Object)
], CreateErpMaterialFileDto.prototype, "saleOrderNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Stored file name (unique with saleOrderNumber)',
        maxLength: 500,
        example: 'packing_list_SO-2025-000123.pdf'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(1),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], CreateErpMaterialFileDto.prototype, "fileName", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Optional description/notes',
        maxLength: 2000
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(2000),
    _ts_metadata("design:type", Object)
], CreateErpMaterialFileDto.prototype, "description", void 0);

//# sourceMappingURL=create-erp-material-file.dto.js.map