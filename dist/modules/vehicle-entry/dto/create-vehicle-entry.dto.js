"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateVehicleEntryDto", {
    enumerable: true,
    get: function() {
        return CreateVehicleEntryDto;
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
let CreateVehicleEntryDto = class CreateVehicleEntryDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Tata Motors',
        description: 'Name of the customer (from dropdown)'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateVehicleEntryDto.prototype, "customerName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'MH12AB1234',
        description: 'Vehicle registration number'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateVehicleEntryDto.prototype, "vehicleNumber", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'VRL Logistics',
        description: 'Name of the transporter'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateVehicleEntryDto.prototype, "transporterName", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: '9876543210',
        description: 'Driver contact number'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", String)
], CreateVehicleEntryDto.prototype, "driverNumber", void 0);

//# sourceMappingURL=create-vehicle-entry.dto.js.map