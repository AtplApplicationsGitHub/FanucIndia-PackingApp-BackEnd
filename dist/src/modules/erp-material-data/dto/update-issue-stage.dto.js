"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateIssueStageDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateIssueStageDto {
    materialCode;
    issueStage;
}
exports.UpdateIssueStageDto = UpdateIssueStageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'MAT-12345', description: 'The material code.' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateIssueStageDto.prototype, "materialCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2, description: 'The new issue stage value.' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateIssueStageDto.prototype, "issueStage", void 0);
//# sourceMappingURL=update-issue-stage.dto.js.map