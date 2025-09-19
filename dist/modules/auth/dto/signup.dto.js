"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SignupDto", {
    enumerable: true,
    get: function() {
        return SignupDto;
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
let SignupDto = class SignupDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'John Doe',
        description: 'Full name of the user'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], SignupDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'test@mail.com',
        description: 'User email address'
    }),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], SignupDto.prototype, "email", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'password123',
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
], SignupDto.prototype, "password", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'SALES',
        description: 'User role (SALES, ADMIN or USER)',
        enum: [
            'SALES',
            'ADMIN',
            'USER'
        ]
    }),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsIn)([
        'SALES',
        'ADMIN',
        'USER'
    ], {
        message: 'Role must be either SALES, ADMIN, or USER'
    }),
    _ts_metadata("design:type", String)
], SignupDto.prototype, "role", void 0);

//# sourceMappingURL=signup.dto.js.map