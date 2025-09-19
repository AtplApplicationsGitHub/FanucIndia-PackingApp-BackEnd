"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FgDashboardController", {
    enumerable: true,
    get: function() {
        return FgDashboardController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _fgdashboardservice = require("./fg-dashboard.service");
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
let FgDashboardController = class FgDashboardController {
    getFgDashboardData(req, query) {
        return this.fgDashboardService.getFgDashboardData(req.user, query);
    }
    constructor(fgDashboardService){
        this.fgDashboardService = fgDashboardService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    (0, _swagger.ApiQuery)({
        name: 'search',
        required: false,
        type: String
    }),
    (0, _swagger.ApiQuery)({
        name: 'date',
        required: false,
        type: String,
        description: 'YYYY-MM-DD'
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], FgDashboardController.prototype, "getFgDashboardData", null);
FgDashboardController = _ts_decorate([
    (0, _swagger.ApiTags)('FG Dashboard'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('fg-dashboard'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _fgdashboardservice.FgDashboardService === "undefined" ? Object : _fgdashboardservice.FgDashboardService
    ])
], FgDashboardController);

//# sourceMappingURL=fg-dashboard.controller.js.map