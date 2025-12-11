"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateMaterialBarcodeDto", {
    enumerable: true,
    get: function() {
        return CreateMaterialBarcodeDto;
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
let CreateMaterialBarcodeDto = class CreateMaterialBarcodeDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'ERP Code',
        example: 'MAT-001'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateMaterialBarcodeDto.prototype, "erpCode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Mapping Barcode',
        example: 'BAR-001'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateMaterialBarcodeDto.prototype, "mappingBarcode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Group',
        example: 'Group A'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateMaterialBarcodeDto.prototype, "group", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Accept Bulk Data',
        default: false
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateMaterialBarcodeDto.prototype, "acceptBulkData", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Remarks Required',
        default: false
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateMaterialBarcodeDto.prototype, "remarksRequired", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Classification',
        example: 'Class A'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateMaterialBarcodeDto.prototype, "classification", void 0);

//# sourceMappingURL=createMaterialBarcodeDto.js.map