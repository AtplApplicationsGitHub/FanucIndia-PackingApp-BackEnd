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
exports.UpdateUserDto = exports.CreateUserDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateUserDto {
    name;
    email;
    password;
    role;
}
exports.CreateUserDto = CreateUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'John Doe', description: 'Full name of the user' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'user@mail.com', description: 'User email address' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'password123', minLength: 8, description: 'Password (min 8 chars)' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'SALES',
        description: 'User role (SALES, ADMIN, USER)',
        enum: ['SALES', 'ADMIN', 'USER'],
        default: 'SALES',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['SALES', 'ADMIN', 'USER']),
    __metadata("design:type", String)
], CreateUserDto.prototype, "role", void 0);
class UpdateUserDto {
    name;
    email;
    password;
    role;
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Jane Smith', description: 'Full name of the user' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'jane@mail.com', description: 'User email address' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'newpassword123', minLength: 8, description: 'Password (min 8 chars)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'USER',
        description: 'User role (SALES, ADMIN, USER)',
        enum: ['SALES', 'ADMIN', 'USER'],
        default: 'USER',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['SALES', 'ADMIN', 'USER']),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "role", void 0);
//# sourceMappingURL=user.dto.js.map