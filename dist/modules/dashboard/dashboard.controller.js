"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DashboardController", {
    enumerable: true,
    get: function() {
        return DashboardController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _authrequesttype = require("../auth/types/auth-request.type");
const _dashboardservice = require("./dashboard.service");
const _saleskpidto = require("./dto/sales-kpi.dto");
const _salesactivitydto = require("./dto/sales-activity.dto");
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
let DashboardController = class DashboardController {
    async getSalesKpis(req) {
        return this.dashboardService.getSalesKpis(req.user.userId);
    }
    async getSalesRecentActivity(req) {
        return this.dashboardService.getSalesRecentActivity(req.user.userId);
    }
    constructor(dashboardService){
        this.dashboardService = dashboardService;
    }
};
_ts_decorate([
    (0, _common.Get)('sales-kpis'),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Get KPI counters for the SALES dashboard'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        type: _saleskpidto.SalesKpiDto
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], DashboardController.prototype, "getSalesKpis", null);
_ts_decorate([
    (0, _common.Get)('sales-activity'),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Get recent activity feed for the SALES dashboard'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        type: [
            _salesactivitydto.SalesActivityDto
        ]
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], DashboardController.prototype, "getSalesRecentActivity", null);
DashboardController = _ts_decorate([
    (0, _swagger.ApiTags)('Dashboard'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('dashboard'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _dashboardservice.DashboardService === "undefined" ? Object : _dashboardservice.DashboardService
    ])
], DashboardController);

//# sourceMappingURL=dashboard.controller.js.map