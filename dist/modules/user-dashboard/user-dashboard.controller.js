"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserDashboardController", {
    enumerable: true,
    get: function() {
        return UserDashboardController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _authrequesttype = require("../auth/types/auth-request.type");
const _userdashboardservice = require("./user-dashboard.service");
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
let UserDashboardController = class UserDashboardController {
    getAssignedOrders(req) {
        const userId = req.user.userId;
        return this.userDashboardService.findAssignedOrders(userId);
    }
    async getOrderDetails(id, req) {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const order = await this.userDashboardService.findOrderById(id, userId, userRole);
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or you do not have permission to view it.');
        }
        return order;
    }
    constructor(userDashboardService){
        this.userDashboardService = userDashboardService;
    }
};
_ts_decorate([
    (0, _common.Get)('orders'),
    (0, _rolesdecorator.Roles)('USER'),
    (0, _swagger.ApiOperation)({
        summary: "Get all sales orders assigned to the logged-in user"
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Assigned orders returned successfully'
    }),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], UserDashboardController.prototype, "getAssignedOrders", null);
_ts_decorate([
    (0, _common.Get)('orders/:id'),
    (0, _rolesdecorator.Roles)('USER', 'ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: "Get details for a specific sales order"
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales order details returned'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Order not found or access denied'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], UserDashboardController.prototype, "getOrderDetails", null);
UserDashboardController = _ts_decorate([
    (0, _swagger.ApiTags)('User Dashboard'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('user-dashboard'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userdashboardservice.UserDashboardService === "undefined" ? Object : _userdashboardservice.UserDashboardService
    ])
], UserDashboardController);

//# sourceMappingURL=user-dashboard.controller.js.map