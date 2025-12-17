"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get MaterialDataDto () {
        return MaterialDataDto;
    },
    get UpdateMaterialDataDto () {
        return UpdateMaterialDataDto;
    }
});
const _swagger = require("@nestjs/swagger");
const _classtransformer = require("class-transformer");
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
let MaterialDataDto = class MaterialDataDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Unique ID of the material row (BigInt)',
        example: '101'
    }),
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", Object)
], MaterialDataDto.prototype, "ID", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], MaterialDataDto.prototype, "Material_Code", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", Number)
], MaterialDataDto.prototype, "Issue_stage", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)(),
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", Number)
], MaterialDataDto.prototype, "Packing_stage", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'The ISO 8601 timestamp of when the update was made offline',
        example: '2025-10-30T10:30:00.000Z'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], MaterialDataDto.prototype, "UpdatedDate", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], MaterialDataDto.prototype, "Remarks", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], MaterialDataDto.prototype, "Accept_Bulk_Data", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], MaterialDataDto.prototype, "Classification", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], MaterialDataDto.prototype, "Group", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], MaterialDataDto.prototype, "Mapping_Barcode", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)(),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], MaterialDataDto.prototype, "Remarks_Required", void 0);
let UpdateMaterialDataDto = class UpdateMaterialDataDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        type: [
            MaterialDataDto
        ]
    }),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classtransformer.Type)(()=>MaterialDataDto),
    _ts_metadata("design:type", Array)
], UpdateMaterialDataDto.prototype, "materials", void 0);

//# sourceMappingURL=update-material-data.dto.js.map