"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UploadErpMaterialFileDto", {
    enumerable: true,
    get: function() {
        return UploadErpMaterialFileDto;
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
let UploadErpMaterialFileDto = class UploadErpMaterialFileDto {
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
], UploadErpMaterialFileDto.prototype, "saleOrderNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'A JSON string mapping each original filename to its description.',
        example: '{"photo1.jpg": "Picture of the packed items", "doc1.pdf": "Shipping manifest"}'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UploadErpMaterialFileDto.prototype, "descriptions", void 0);

//# sourceMappingURL=upload-erp-material-file.dto.js.map