"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "QueryErpMaterialFileDto", {
    enumerable: true,
    get: function() {
        return QueryErpMaterialFileDto;
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
let QueryErpMaterialFileDto = class QueryErpMaterialFileDto {
    constructor(){
        this.page = 1;
        this.limit = 20;
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
    }
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Search text (fileName / description / saleOrderNumber)',
        example: 'packing'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QueryErpMaterialFileDto.prototype, "search", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'Filter by sale order number exactly',
        example: 'SO-2025-000123',
        maxLength: 500
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(1),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], QueryErpMaterialFileDto.prototype, "saleOrderNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: 1,
        minimum: 1
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Type)(()=>Number),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(1),
    _ts_metadata("design:type", Number)
], QueryErpMaterialFileDto.prototype, "page", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        default: 20,
        minimum: 1
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classtransformer.Type)(()=>Number),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(1),
    _ts_metadata("design:type", Number)
], QueryErpMaterialFileDto.prototype, "limit", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: [
            'createdAt',
            'updatedAt',
            'fileName',
            'ID'
        ],
        default: 'createdAt'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsIn)([
        'createdAt',
        'updatedAt',
        'fileName',
        'ID'
    ]),
    _ts_metadata("design:type", String)
], QueryErpMaterialFileDto.prototype, "sortBy", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        enum: [
            'asc',
            'desc'
        ],
        default: 'desc'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsIn)([
        'asc',
        'desc'
    ]),
    _ts_metadata("design:type", String)
], QueryErpMaterialFileDto.prototype, "sortOrder", void 0);

//# sourceMappingURL=query-erp-material-file.dto.js.map