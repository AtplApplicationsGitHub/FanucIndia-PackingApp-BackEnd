"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdatePackingStageDto", {
    enumerable: true,
    get: function() {
        return UpdatePackingStageDto;
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
let UpdatePackingStageDto = class UpdatePackingStageDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'ROB-HAND-001'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePackingStageDto.prototype, "materialCode", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 1
    }),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], UpdatePackingStageDto.prototype, "packingStage", void 0);

//# sourceMappingURL=update-packing-stage.dto.js.map