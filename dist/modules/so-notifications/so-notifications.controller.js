"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoNotificationsController", {
    enumerable: true,
    get: function() {
        return SoNotificationsController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _authrequesttype = require("../auth/types/auth-request.type");
const _sonotificationsservice = require("./so-notifications.service");
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
let SoNotificationsController = class SoNotificationsController {
    list(req) {
        return this.service.list(req.user);
    }
    delete(id, req) {
        return this.service.delete(Number(id), req.user);
    }
    constructor(service){
        this.service = service;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _rolesdecorator.Roles)('ADMIN', 'SALES', 'USER'),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], SoNotificationsController.prototype, "list", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _rolesdecorator.Roles)('ADMIN', 'SALES', 'USER'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], SoNotificationsController.prototype, "delete", null);
SoNotificationsController = _ts_decorate([
    (0, _swagger.ApiTags)('SO Notifications'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('so-notifications'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _sonotificationsservice.SoNotificationsService === "undefined" ? Object : _sonotificationsservice.SoNotificationsService
    ])
], SoNotificationsController);

//# sourceMappingURL=so-notifications.controller.js.map