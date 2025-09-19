"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoSearchController", {
    enumerable: true,
    get: function() {
        return SoSearchController;
    }
});
const _common = require("@nestjs/common");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _sosearchservice = require("./so-search.service");
const _swagger = require("@nestjs/swagger");
const _rolesdecorator = require("../auth/roles.decorator");
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
let SoSearchController = class SoSearchController {
    findDetails(soNumber, req) {
        return this.soSearchService.findDetailsBySoNumber(soNumber, req.user);
    }
    constructor(soSearchService){
        this.soSearchService = soSearchService;
    }
};
_ts_decorate([
    (0, _common.Get)(':soNumber'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER', 'SALES'),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], SoSearchController.prototype, "findDetails", null);
SoSearchController = _ts_decorate([
    (0, _swagger.ApiTags)('SO Search'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('so-search'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _sosearchservice.SoSearchService === "undefined" ? Object : _sosearchservice.SoSearchService
    ])
], SoSearchController);

//# sourceMappingURL=so-search.controller.js.map