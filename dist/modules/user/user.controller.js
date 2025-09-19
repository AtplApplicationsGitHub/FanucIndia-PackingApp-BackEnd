"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserController", {
    enumerable: true,
    get: function() {
        return UserController;
    }
});
const _common = require("@nestjs/common");
const _userservice = require("./user.service");
const _userdto = require("./dto/user.dto");
const _swagger = require("@nestjs/swagger");
const _authrequesttype = require("../auth/types/auth-request.type");
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
let UserController = class UserController {
    create(dto) {
        return this.userService.create(dto);
    }
    findAll(role) {
        return this.userService.findAll(role);
    }
    update(id, dto) {
        return this.userService.update(id, dto);
    }
    remove(id, req) {
        const currentUserId = req.user.userId;
        if (id === currentUserId) {
            throw new _common.ForbiddenException('You cannot delete your own admin account.');
        }
        return this.userService.remove(id);
    }
    constructor(userService){
        this.userService = userService;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create a new user (Admin only)'
    }),
    (0, _swagger.ApiBody)({
        type: _userdto.CreateUserDto
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'User created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 400,
        description: 'Validation failed'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userdto.CreateUserDto === "undefined" ? Object : _userdto.CreateUserDto
    ]),
    _ts_metadata("design:returntype", void 0)
], UserController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'Get all users (Admin only)'
    }),
    (0, _swagger.ApiQuery)({
        name: 'role',
        required: false,
        type: String,
        description: 'Filter by user role'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'List of all users'
    }),
    _ts_param(0, (0, _common.Query)('role')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], UserController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update user details by ID (Admin only)'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiBody)({
        type: _userdto.UpdateUserDto
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'User updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'User not found'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _userdto.UpdateUserDto === "undefined" ? Object : _userdto.UpdateUserDto
    ]),
    _ts_metadata("design:returntype", void 0)
], UserController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a user by ID (Admin only)'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'User deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'User not found'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], UserController.prototype, "remove", null);
UserController = _ts_decorate([
    (0, _swagger.ApiTags)('Users'),
    (0, _common.Controller)('users'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService
    ])
], UserController);

//# sourceMappingURL=user.controller.js.map