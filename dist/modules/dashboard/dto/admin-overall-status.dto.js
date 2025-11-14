"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminOverallStatusDto", {
    enumerable: true,
    get: function() {
        return AdminOverallStatusDto;
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
let AdminOverallStatusDto = class AdminOverallStatusDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 150,
        description: "Total count of orders with status 'R105' (Imported/Assigned)"
    }),
    _ts_metadata("design:type", Number)
], AdminOverallStatusDto.prototype, "r105Count", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 85,
        description: "Total count of orders with status 'W105' (Issued)"
    }),
    _ts_metadata("design:type", Number)
], AdminOverallStatusDto.prototype, "w105Count", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 62,
        description: "Total count of orders with status 'F105' (Packed/Awaiting Dispatch)"
    }),
    _ts_metadata("design:type", Number)
], AdminOverallStatusDto.prototype, "f105Count", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 850,
        description: "Total count of orders with status 'Dispatched'"
    }),
    _ts_metadata("design:type", Number)
], AdminOverallStatusDto.prototype, "dispatchedCount", void 0);

//# sourceMappingURL=admin-overall-status.dto.js.map