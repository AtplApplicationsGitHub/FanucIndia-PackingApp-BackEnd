"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminDispatchSummaryDto", {
    enumerable: true,
    get: function() {
        return AdminDispatchSummaryDto;
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
let AdminDispatchSummaryDto = class AdminDispatchSummaryDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 8,
        description: "Count of orders with deliveryDate of today that are not yet dispatched (includes status NULL)"
    }),
    _ts_metadata("design:type", Number)
], AdminDispatchSummaryDto.prototype, "ordersToBeDispatched", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 5,
        description: "Count of orders with status 'Stored/Ready for Dispatch' and deliveryDate of today"
    }),
    _ts_metadata("design:type", Number)
], AdminDispatchSummaryDto.prototype, "readyForDispatchToday", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 22,
        description: 'Count of orders that were moved to "Dispatched" status today'
    }),
    _ts_metadata("design:type", Number)
], AdminDispatchSummaryDto.prototype, "ordersDispatchedToday", void 0);

//# sourceMappingURL=admin-dispatch-summary.dto.js.map