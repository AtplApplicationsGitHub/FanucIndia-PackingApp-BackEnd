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
exports.AdminSalesOrdersController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const roles_decorator_1 = require("../auth/roles.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let AdminSalesOrdersController = class AdminSalesOrdersController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSalesOrderById(id) {
        const order = await this.prisma.salesOrder.findUnique({
            where: { id },
            include: { customer: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Sales order not found');
        }
        return order;
    }
};
exports.AdminSalesOrdersController = AdminSalesOrdersController;
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a specific sales order by its ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'The ID of the sales order', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sales order details returned successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden. User does not have the required role.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Sales order not found.' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminSalesOrdersController.prototype, "getSalesOrderById", null);
exports.AdminSalesOrdersController = AdminSalesOrdersController = __decorate([
    (0, swagger_1.ApiTags)('Admin Orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('admin/sales-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminSalesOrdersController);
//# sourceMappingURL=admin-sales-orders.controller.js.map