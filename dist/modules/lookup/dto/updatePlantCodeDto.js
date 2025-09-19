"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdatePlantCodeDto", {
    enumerable: true,
    get: function() {
        return UpdatePlantCodeDto;
    }
});
const _classvalidator = require("class-validator");
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
let UpdatePlantCodeDto = class UpdatePlantCodeDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'IN02',
        description: 'Updated plant code'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlantCodeDto.prototype, "code", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Chennai Factory',
        description: 'Updated description'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePlantCodeDto.prototype, "description", void 0);

//# sourceMappingURL=updatePlantCodeDto.js.map