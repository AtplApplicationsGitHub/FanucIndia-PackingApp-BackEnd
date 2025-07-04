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
exports.SalesCrudController = void 0;
const common_1 = require("@nestjs/common");
const sales_crud_service_1 = require("./sales-crud.service");
const create_sales_crud_dto_1 = require("./dto/create-sales-crud.dto");
const update_sales_crud_dto_1 = require("./dto/update-sales-crud.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
let SalesCrudController = class SalesCrudController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(dto, req) {
        return this.service.create(dto, req.user.userId);
    }
    findAll(req) {
        return this.service.findAll(req.user.userId, req.query);
    }
    findOne(id, req) {
        return this.service.findOne(id, req.user.userId);
    }
    update(id, dto, req) {
        return this.service.update(id, dto, req.user.userId);
    }
    remove(id, req) {
        return this.service.remove(id, req.user.userId);
    }
};
exports.SalesCrudController = SalesCrudController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('sales'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_sales_crud_dto_1.CreateSalesCrudDto, Object]),
    __metadata("design:returntype", void 0)
], SalesCrudController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('sales'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SalesCrudController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('sales'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], SalesCrudController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('sales'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_sales_crud_dto_1.UpdateSalesCrudDto, Object]),
    __metadata("design:returntype", void 0)
], SalesCrudController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('sales'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], SalesCrudController.prototype, "remove", null);
exports.SalesCrudController = SalesCrudController = __decorate([
    (0, swagger_1.ApiTags)('Sales Orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('sales-crud'),
    __metadata("design:paramtypes", [sales_crud_service_1.SalesCrudService])
], SalesCrudController);
//# sourceMappingURL=sales-crud.controller.js.map