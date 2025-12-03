"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateMobileDispatchDto", {
    enumerable: true,
    get: function() {
        return CreateMobileDispatchDto;
    }
});
const _swagger = require("@nestjs/swagger");
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
let CreateMobileDispatchDto = class CreateMobileDispatchDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'The ID of the existing transporter.',
        example: '2'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumberString)(),
    (0, _classvalidator.ValidateIf)((o)=>!o.transporterName),
    (0, _classvalidator.IsDefined)({
        message: 'Either transporterId or transporterName must be provided.'
    }),
    _ts_metadata("design:type", Number)
], CreateMobileDispatchDto.prototype, "transporterId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'The name of the new or existing transporter.',
        example: 'VRL Logistics'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.ValidateIf)((o)=>!o.transporterId),
    (0, _classvalidator.IsDefined)({
        message: 'Either transporterId or transporterName must be provided.'
    }),
    _ts_metadata("design:type", String)
], CreateMobileDispatchDto.prototype, "transporterName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'The vehicle registration number.',
        example: 'MH12AB1234'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateMobileDispatchDto.prototype, "vehicleNumber", void 0);

//# sourceMappingURL=create-mobile-dispatch.dto.js.map