"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminSalesOrdersController", {
    enumerable: true,
    get: function() {
        return AdminSalesOrdersController;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _rolesdecorator = require("../auth/roles.decorator");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _swagger = require("@nestjs/swagger");
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
let AdminSalesOrdersController = class AdminSalesOrdersController {
    async getSalesOrderById(id) {
        const order = await this.prisma.salesOrder.findUnique({
            where: {
                id
            },
            include: {
                customer: true
            }
        });
        if (!order) {
            throw new _common.NotFoundException('Sales order not found');
        }
        return order;
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _rolesdecorator.Roles)('ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: 'Get a specific sales order by its ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        description: 'The ID of the sales order',
        type: Number
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales order details returned successfully.'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Forbidden. User does not have the required role.'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Sales order not found.'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", Promise)
], AdminSalesOrdersController.prototype, "getSalesOrderById", null);
AdminSalesOrdersController = _ts_decorate([
    (0, _swagger.ApiTags)('Admin Orders'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.Controller)('admin/sales-orders'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], AdminSalesOrdersController);

//# sourceMappingURL=admin-sales-orders.controller.js.map