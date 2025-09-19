"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthController", {
    enumerable: true,
    get: function() {
        return AuthController;
    }
});
const _common = require("@nestjs/common");
const _express = require("express");
const _authservice = require("./auth.service");
const _signupdto = require("./dto/signup.dto");
const _logindto = require("./dto/login.dto");
const _swagger = require("@nestjs/swagger");
const _publicdecorator = require("./public.decorator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let AuthController = class AuthController {
    signup(dto, req) {
        return this.authService.signup(dto, req);
    }
    login(dto, req) {
        return this.authService.login(dto, req);
    }
    checkEmail(email) {
        if (!email) return {
            exists: false
        };
        return this.authService.checkEmailExists(email).then((exists)=>({
                exists
            }));
    }
    constructor(authService){
        this.authService = authService;
    }
};
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('signup'),
    (0, _swagger.ApiOperation)({
        summary: 'Register a new user (sales or admin)'
    }),
    (0, _swagger.ApiBody)({
        type: _signupdto.SignupDto
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'User signed up successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'Email already in use'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _signupdto.SignupDto === "undefined" ? Object : _signupdto.SignupDto,
        typeof _express.Request === "undefined" ? Object : _express.Request
    ]),
    _ts_metadata("design:returntype", void 0)
], AuthController.prototype, "signup", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('login'),
    (0, _swagger.ApiOperation)({
        summary: 'Login an existing user and receive JWT'
    }),
    (0, _swagger.ApiBody)({
        type: _logindto.LoginDto
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Login successful, returns JWT token'
    }),
    (0, _swagger.ApiResponse)({
        status: 401,
        description: 'Invalid email or password'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _logindto.LoginDto === "undefined" ? Object : _logindto.LoginDto,
        typeof _express.Request === "undefined" ? Object : _express.Request
    ]),
    _ts_metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Get)('check-email'),
    (0, _swagger.ApiOperation)({
        summary: 'Check if an email is already registered'
    }),
    (0, _swagger.ApiQuery)({
        name: 'email',
        required: true,
        description: 'Email to check',
        type: String
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Returns whether email exists or not'
    }),
    _ts_param(0, (0, _common.Query)('email')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], AuthController.prototype, "checkEmail", null);
AuthController = _ts_decorate([
    (0, _swagger.ApiTags)('Auth'),
    (0, _common.Controller)('auth'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService
    ])
], AuthController);

//# sourceMappingURL=auth.controller.js.map