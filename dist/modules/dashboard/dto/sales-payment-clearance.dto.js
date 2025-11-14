"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesPaymentClearanceDto", {
    enumerable: true,
    get: function() {
        return SalesPaymentClearanceDto;
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
let SalesPaymentClearanceDto = class SalesPaymentClearanceDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'North Zone',
        description: "The name of the sales zone"
    }),
    _ts_metadata("design:type", String)
], SalesPaymentClearanceDto.prototype, "zoneName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 60,
        description: 'Count of non-dispatched orders with payment cleared'
    }),
    _ts_metadata("design:type", Number)
], SalesPaymentClearanceDto.prototype, "paymentCleared", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 15,
        description: 'Count of non-dispatched orders with payment pending'
    }),
    _ts_metadata("design:type", Number)
], SalesPaymentClearanceDto.prototype, "paymentPending", void 0);

//# sourceMappingURL=sales-payment-clearance.dto.js.map