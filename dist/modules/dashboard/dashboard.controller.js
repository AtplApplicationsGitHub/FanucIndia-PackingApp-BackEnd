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
const _adminkpidto = require("./dto/admin-kpi.dto");
const _salespaymentclearancedto = require("./dto/sales-payment-clearance.dto");
const _adminnewimportsdto = require("./dto/admin-new-imports.dto");
const _admindispatchsummarydto = require("./dto/admin-dispatch-summary.dto");
const _adminoverallstatusdto = require("./dto/admin-overall-status.dto");
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
    // --- ADMIN ENDPOINTS ---
    async getAdminKpis() {
        return this.dashboardService.getAdminKpis();
    }
    async getAdminNewImports() {
        return this.dashboardService.getAdminNewImports();
    }
    async getAdminDispatchSummary() {
        return this.dashboardService.getAdminDispatchSummary();
    }
    async getAdminOverallStatus() {
        return this.dashboardService.getAdminOverallStatus();
    }
    // --- SALES ENDPOINTS ---
    async getSalesKpis(req) {
        return this.dashboardService.getSalesKpis(req.user.userId);
    }
    async getSalesRecentActivity(req) {
        return this.dashboardService.getSalesRecentActivity(req.user.userId);
    }
    async getSalesPaymentClearance(req) {
        return this.dashboardService.getSalesPaymentClearanceByZone(req.user.userId);
    }
    constructor(dashboardService){
        this.dashboardService = dashboardService;
    }
};
_ts_decorate([
    (0, _common.Get)('admin-kpis'),
    (0, _rolesdecorator.Roles)('ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: 'Get KPI counters for the ADMIN dashboard'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        type: _adminkpidto.AdminKpiDto
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], DashboardController.prototype, "getAdminKpis", null);
_ts_decorate([
    (0, _common.Get)('admin-new-imports'),
    (0, _rolesdecorator.Roles)('ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: 'Get new material import counts for the last 5 days'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        type: [
            _adminnewimportsdto.AdminNewImportDto
        ]
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], DashboardController.prototype, "getAdminNewImports", null);
_ts_decorate([
    (0, _common.Get)('admin-dispatch-summary'),
    (0, _rolesdecorator.Roles)('ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: "Get today's dispatch summary"
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        type: _admindispatchsummarydto.AdminDispatchSummaryDto
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], DashboardController.prototype, "getAdminDispatchSummary", null);
_ts_decorate([
    (0, _common.Get)('admin-overall-status'),
    (0, _rolesdecorator.Roles)('ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: 'Get system-wide counts of orders by status'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        type: _adminoverallstatusdto.AdminOverallStatusDto
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], DashboardController.prototype, "getAdminOverallStatus", null);
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
_ts_decorate([
    (0, _common.Get)('sales-payment-clearance'),
    (0, _rolesdecorator.Roles)('SALES'),
    (0, _swagger.ApiOperation)({
        summary: 'Get payment clearance counts by sales zone for the SALES user (for graph)'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        type: [
            _salespaymentclearancedto.SalesPaymentClearanceDto
        ]
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], DashboardController.prototype, "getSalesPaymentClearance", null);
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