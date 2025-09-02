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
exports.DispatchController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const dispatch_service_1 = require("./dispatch.service");
const create_dispatch_dto_1 = require("./dto/create-dispatch.dto");
const update_dispatch_dto_1 = require("./dto/update-dispatch.dto");
const swagger_1 = require("@nestjs/swagger");
let DispatchController = class DispatchController {
    dispatchService;
    constructor(dispatchService) {
        this.dispatchService = dispatchService;
    }
    create(createDispatchDto, files, req) {
        return this.dispatchService.create(createDispatchDto, files, req.user.userId);
    }
    findAll() {
        return this.dispatchService.findAll();
    }
    update(id, updateDispatchDto) {
        return this.dispatchService.update(id, updateDispatchDto);
    }
    findDispatchSOs(id) {
        return this.dispatchService.findDispatchSOs(id);
    }
    addDispatchSO(id, saleOrderNumber) {
        return this.dispatchService.addDispatchSO(id, saleOrderNumber);
    }
    removeDispatchSO(soId) {
        return this.dispatchService.removeDispatchSO(soId);
    }
    async generatePdf(id, res) {
        const pdfBuffer = await this.dispatchService.generatePdf(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=dispatch_${id}.pdf`,
            'Content-Length': pdfBuffer.length,
        });
        res.send(pdfBuffer);
    }
    addAttachments(id, files) {
        return this.dispatchService.addAttachments(id, files);
    }
    deleteAttachment(id, fileName) {
        if (!fileName) {
            throw new common_1.BadRequestException('fileName is required');
        }
        return this.dispatchService.deleteAttachment(id, fileName);
    }
    async downloadDispatchAttachment(id, fileName, res) {
        const { stream, mimeType } = await this.dispatchService.getAttachmentStream(id, fileName);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-Type', mimeType || 'application/octet-stream');
        stream.pipe(res);
    }
};
exports.DispatchController = DispatchController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', 10, {
        storage: (0, multer_1.diskStorage)({
            destination: './temp_uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32)
                    .fill(null)
                    .map(() => Math.round(Math.random() * 16).toString(16))
                    .join('');
                cb(null, `${randomName}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_dispatch_dto_1.CreateDispatchDto, Array, Object]),
    __metadata("design:returntype", void 0)
], DispatchController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DispatchController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_dispatch_dto_1.UpdateDispatchDto]),
    __metadata("design:returntype", void 0)
], DispatchController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/so'),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], DispatchController.prototype, "findDispatchSOs", null);
__decorate([
    (0, common_1.Post)(':id/so'),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('saleOrderNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], DispatchController.prototype, "addDispatchSO", null);
__decorate([
    (0, common_1.Delete)('so/:soId'),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    __param(0, (0, common_1.Param)('soId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], DispatchController.prototype, "removeDispatchSO", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], DispatchController.prototype, "generatePdf", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', 10, {
        storage: (0, multer_1.diskStorage)({
            destination: './temp_uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32)
                    .fill(null)
                    .map(() => Math.round(Math.random() * 16).toString(16))
                    .join('');
                cb(null, `${randomName}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
    })),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Array]),
    __metadata("design:returntype", void 0)
], DispatchController.prototype, "addAttachments", null);
__decorate([
    (0, common_1.Delete)(':id/attachments'),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('fileName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], DispatchController.prototype, "deleteAttachment", null);
__decorate([
    (0, common_1.Get)(':id/attachments/:fileName'),
    (0, roles_decorator_1.Roles)('ADMIN', 'USER', 'SALES'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('fileName')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", Promise)
], DispatchController.prototype, "downloadDispatchAttachment", null);
exports.DispatchController = DispatchController = __decorate([
    (0, swagger_1.ApiTags)('Dispatch'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('dispatch'),
    __metadata("design:paramtypes", [dispatch_service_1.DispatchService])
], DispatchController);
//# sourceMappingURL=dispatch.controller.js.map