"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get CreateUserDto () {
        return CreateUserDto;
    },
    get UpdateUserDto () {
        return UpdateUserDto;
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
let CreateUserDto = class CreateUserDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'John Doe'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateUserDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'john.doe@example.com or johndoe'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Password (min 8 chars for Admin/Sales, 4-digit PIN for User)'
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.ValidateIf)((o)=>o.role !== 'USER'),
    (0, _classvalidator.MinLength)(8, {
        message: 'Password must be at least 8 characters long'
    }),
    (0, _classvalidator.ValidateIf)((o)=>o.role === 'USER'),
    (0, _classvalidator.Matches)(/^\d{4}$/, {
        message: 'Password must be a 4-digit PIN for the USER role'
    }),
    _ts_metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'USER',
        enum: [
            'ADMIN',
            'SALES',
            'USER'
        ]
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsIn)([
        'ADMIN',
        'SALES',
        'USER'
    ]),
    _ts_metadata("design:type", String)
], CreateUserDto.prototype, "role", void 0);
let UpdateUserDto = class UpdateUserDto extends (0, _swagger.PartialType)(CreateUserDto) {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Optional new password',
        required: false
    }),
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.ValidateIf)((o)=>o.role !== 'USER' && o.password),
    (0, _classvalidator.MinLength)(8, {
        message: 'Password must be at least 8 characters long'
    }),
    (0, _classvalidator.ValidateIf)((o)=>o.role === 'USER' && o.password),
    (0, _classvalidator.Matches)(/^\d{4}$/, {
        message: 'Password must be a 4-digit PIN for the USER role'
    }),
    _ts_metadata("design:type", String)
], UpdateUserDto.prototype, "password", void 0);

//# sourceMappingURL=user.dto.js.map