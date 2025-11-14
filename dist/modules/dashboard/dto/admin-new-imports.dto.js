"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminNewImportDto", {
    enumerable: true,
    get: function() {
        return AdminNewImportDto;
    }
});
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
let AdminNewImportDto = class AdminNewImportDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Today (Nov 13)',
        description: 'The label for the day'
    }),
    _ts_metadata("design:type", String)
], AdminNewImportDto.prototype, "dayLabel", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '2025-11-13',
        description: 'The date in YYYY-MM-DD format'
    }),
    _ts_metadata("design:type", String)
], AdminNewImportDto.prototype, "date", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 12,
        description: 'The count of distinct SOs imported on this day'
    }),
    _ts_metadata("design:type", Number)
], AdminNewImportDto.prototype, "count", void 0);

//# sourceMappingURL=admin-new-imports.dto.js.map