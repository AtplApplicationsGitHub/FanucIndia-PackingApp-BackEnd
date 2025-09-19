"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateIssueStageDto", {
    enumerable: true,
    get: function() {
        return UpdateIssueStageDto;
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
let UpdateIssueStageDto = class UpdateIssueStageDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'MAT-12345',
        description: 'The material code.'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateIssueStageDto.prototype, "materialCode", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 2,
        description: 'The new issue stage value.'
    }),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], UpdateIssueStageDto.prototype, "issueStage", void 0);

//# sourceMappingURL=update-issue-stage.dto.js.map