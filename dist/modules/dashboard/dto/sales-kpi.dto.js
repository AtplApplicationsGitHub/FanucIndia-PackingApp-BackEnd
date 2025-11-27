"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesKpiDto", {
    enumerable: true,
    get: function() {
        return SalesKpiDto;
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
let SalesKpiDto = class SalesKpiDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 10,
        description: 'Total SOs created by the user'
    }),
    _ts_metadata("design:type", Number)
], SalesKpiDto.prototype, "totalSoCount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 5,
        description: 'Total SOs created by the user that are Dispatched'
    }),
    _ts_metadata("design:type", Number)
], SalesKpiDto.prototype, "dispatchedSoCount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 5,
        description: 'Count of orders with status NULL (To be Issued)'
    }),
    _ts_metadata("design:type", Number)
], SalesKpiDto.prototype, "toBeIssuedCount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 3,
        description: 'Count of orders with status R105 (Assigned)'
    }),
    _ts_metadata("design:type", Number)
], SalesKpiDto.prototype, "r105Count", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 2,
        description: 'Count of orders with status W105 (Issued)'
    }),
    _ts_metadata("design:type", Number)
], SalesKpiDto.prototype, "w105Count", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1,
        description: 'Count of orders with status F105 (Packed)'
    }),
    _ts_metadata("design:type", Number)
], SalesKpiDto.prototype, "f105Count", void 0);

//# sourceMappingURL=sales-kpi.dto.js.map