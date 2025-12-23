"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoChatController", {
    enumerable: true,
    get: function() {
        return SoChatController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _authrequesttype = require("../auth/types/auth-request.type");
const _sochatservice = require("./so-chat.service");
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
let SoChatController = class SoChatController {
    getMentionUsers(soNumber, req) {
        return this.soChatService.getMentionUsers(soNumber, req.user);
    }
    listMessages(soNumber, req) {
        return this.soChatService.listMessages(soNumber, req.user);
    }
    sendMessage(soNumber, body, req) {
        return this.soChatService.sendMessage(soNumber, req.user, body);
    }
    constructor(soChatService){
        this.soChatService = soChatService;
    }
};
_ts_decorate([
    (0, _common.Get)(':soNumber/mention-users'),
    (0, _rolesdecorator.Roles)('ADMIN', 'SALES', 'USER'),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], SoChatController.prototype, "getMentionUsers", null);
_ts_decorate([
    (0, _common.Get)(':soNumber/messages'),
    (0, _rolesdecorator.Roles)('ADMIN', 'SALES', 'USER'),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], SoChatController.prototype, "listMessages", null);
_ts_decorate([
    (0, _common.Post)(':soNumber/messages'),
    (0, _rolesdecorator.Roles)('ADMIN', 'SALES', 'USER'),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], SoChatController.prototype, "sendMessage", null);
SoChatController = _ts_decorate([
    (0, _swagger.ApiTags)('SO Chat'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('so-chat'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _sochatservice.SoChatService === "undefined" ? Object : _sochatservice.SoChatService
    ])
], SoChatController);

//# sourceMappingURL=so-chat.controller.js.map