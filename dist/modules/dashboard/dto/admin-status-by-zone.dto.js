"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminStatusByZoneDto", {
    enumerable: true,
    get: function() {
        return AdminStatusByZoneDto;
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
let AdminStatusByZoneDto = class AdminStatusByZoneDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'North Zone'
    }),
    _ts_metadata("design:type", String)
], AdminStatusByZoneDto.prototype, "zoneName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 40
    }),
    _ts_metadata("design:type", Number)
], AdminStatusByZoneDto.prototype, "r105Count", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 20
    }),
    _ts_metadata("design:type", Number)
], AdminStatusByZoneDto.prototype, "w105Count", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 15
    }),
    _ts_metadata("design:type", Number)
], AdminStatusByZoneDto.prototype, "f105Count", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 210
    }),
    _ts_metadata("design:type", Number)
], AdminStatusByZoneDto.prototype, "dispatchedCount", void 0);

//# sourceMappingURL=admin-status-by-zone.dto.js.map