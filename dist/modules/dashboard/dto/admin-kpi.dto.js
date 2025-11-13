"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminKpiDto", {
    enumerable: true,
    get: function() {
        return AdminKpiDto;
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
let AdminKpiDto = class AdminKpiDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1248,
        description: 'Total SOs in the system'
    }),
    _ts_metadata("design:type", Number)
], AdminKpiDto.prototype, "totalSoCount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 12.5,
        description: 'Percentage change of new SOs this month vs. last month'
    }),
    _ts_metadata("design:type", Number)
], AdminKpiDto.prototype, "totalSoCountPercentageChange", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 526,
        description: 'Total orders currently overdue'
    }),
    _ts_metadata("design:type", Number)
], AdminKpiDto.prototype, "overdueSoCount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 15.2,
        description: 'Percentage change of overdue orders now vs. start of the month'
    }),
    _ts_metadata("design:type", Number)
], AdminKpiDto.prototype, "overdueSoCountPercentageChange", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 756,
        description: 'Total orders ever dispatched'
    }),
    _ts_metadata("design:type", Number)
], AdminKpiDto.prototype, "dispatchedSoCount", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 5.7,
        description: 'Percentage change of orders dispatched this month vs. last month'
    }),
    _ts_metadata("design:type", Number)
], AdminKpiDto.prototype, "dispatchedSoCountPercentageChange", void 0);

//# sourceMappingURL=admin-kpi.dto.js.map