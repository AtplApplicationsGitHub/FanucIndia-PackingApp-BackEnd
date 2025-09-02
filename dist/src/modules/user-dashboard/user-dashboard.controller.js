"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const user_dashboard_service_1 = require("./user-dashboard.service");
let UserDashboardController = class UserDashboardController {
    userDashboardService;
    constructor(userDashboardService) {
        this.userDashboardService = userDashboardService;
    }
    getAssignedOrders(req) {
        const userId = req.user.userId;
        return this.userDashboardService.findAssignedOrders(userId);
    }
    async getOrderDetails(id, req) {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const order = await this.userDashboardService.findOrderById(id, userId, userRole);
        if (!order) {
            throw new common_1.NotFoundException('Sales order not found or you do not have permission to view it.');
        }
        return order;
    }
};
exports.UserDashboardController = UserDashboardController;
__decorate([
    (0, common_1.Get)('orders'),
    (0, roles_decorator_1.Roles)('USER'),
    (0, swagger_1.ApiOperation)({ summary: "Get all sales orders assigned to the logged-in user" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Assigned orders returned successfully' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserDashboardController.prototype, "getAssignedOrders", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, roles_decorator_1.Roles)('USER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: "Get details for a specific sales order" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sales order details returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Order not found or access denied' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], UserDashboardController.prototype, "getOrderDetails", null);
exports.UserDashboardController = UserDashboardController = __decorate([
    (0, swagger_1.ApiTags)('User Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('user-dashboard'),
    __metadata("design:paramtypes", [user_dashboard_service_1.UserDashboardService])
], UserDashboardController);
//# sourceMappingURL=user-dashboard.controller.js.map