"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateMappingDto", {
    enumerable: true,
    get: function() {
        return UpdateMappingDto;
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
let UpdateMappingDto = class UpdateMappingDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Mapping Barcode value',
        required: false
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", String)
], UpdateMappingDto.prototype, "mappingBarcode", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Group value',
        required: false
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", String)
], UpdateMappingDto.prototype, "group", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Material ID (PK of ERP_Material_Data)',
        required: true
    }),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], UpdateMappingDto.prototype, "materialId", void 0);

//# sourceMappingURL=update-mapping.dto.js.map