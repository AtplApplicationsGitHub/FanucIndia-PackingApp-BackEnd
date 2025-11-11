"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesActivityDto", {
    enumerable: true,
    get: function() {
        return SalesActivityDto;
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
let SalesActivityDto = class SalesActivityDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'SO-12345'
    }),
    _ts_metadata("design:type", String)
], SalesActivityDto.prototype, "salesOrderNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Dispatched'
    }),
    _ts_metadata("design:type", String)
], SalesActivityDto.prototype, "status", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '2025-11-10T14:30:00.000Z'
    }),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], SalesActivityDto.prototype, "activityTimestamp", void 0);

//# sourceMappingURL=sales-activity.dto.js.map