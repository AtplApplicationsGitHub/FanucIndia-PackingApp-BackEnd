"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateMobileDispatchDto", {
    enumerable: true,
    get: function() {
        return UpdateMobileDispatchDto;
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
let UpdateMobileDispatchDto = class UpdateMobileDispatchDto {
};
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'The ID of the existing customer.',
        example: 1
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumberString)(),
    (0, _classvalidator.ValidateIf)((o)=>!o.customerName),
    _ts_metadata("design:type", Number)
], UpdateMobileDispatchDto.prototype, "customerId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'The name of the new or existing customer.',
        example: 'Updated Customer Name'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.ValidateIf)((o)=>!o.customerId),
    _ts_metadata("design:type", String)
], UpdateMobileDispatchDto.prototype, "customerName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'The updated dispatch address.',
        example: '456 New St, Anytown'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], UpdateMobileDispatchDto.prototype, "address", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'The ID of the existing transporter.',
        example: 2
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumberString)(),
    (0, _classvalidator.ValidateIf)((o)=>!o.transporterName),
    _ts_metadata("design:type", Number)
], UpdateMobileDispatchDto.prototype, "transporterId", void 0);
_ts_decorate([
    (0, _swagger.ApiPropertyOptional)({
        description: 'The name of the new or existing transporter.',
        example: 'Updated Logistics'
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.ValidateIf)((o)=>!o.transporterId),
    _ts_metadata("design:type", String)
], UpdateMobileDispatchDto.prototype, "transporterName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'The updated vehicle registration number.',
        example: 'KA01XY9876'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], UpdateMobileDispatchDto.prototype, "vehicleNumber", void 0);

//# sourceMappingURL=update-mobile-dispatch.dto.js.map