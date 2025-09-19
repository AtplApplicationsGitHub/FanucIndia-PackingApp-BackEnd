"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DispatchController", {
    enumerable: true,
    get: function() {
        return DispatchController;
    }
});
const _common = require("@nestjs/common");
const _platformexpress = require("@nestjs/platform-express");
const _multer = require("multer");
const _path = require("path");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _authrequesttype = require("../auth/types/auth-request.type");
const _dispatchservice = require("./dispatch.service");
const _createdispatchdto = require("./dto/create-dispatch.dto");
const _updatedispatchdto = require("./dto/update-dispatch.dto");
const _express = require("express");
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
let DispatchController = class DispatchController {
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
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    }
    addAttachments(id, files) {
        return this.dispatchService.addAttachments(id, files);
    }
    deleteAttachment(id, fileName) {
        if (!fileName) {
            throw new _common.BadRequestException('fileName is required');
        }
        return this.dispatchService.deleteAttachment(id, fileName);
    }
    async downloadDispatchAttachment(id, fileName, res) {
        const { stream, mimeType } = await this.dispatchService.getAttachmentStream(id, fileName);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-Type', mimeType || 'application/octet-stream');
        stream.pipe(res);
    }
    constructor(dispatchService){
        this.dispatchService = dispatchService;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    (0, _common.UseInterceptors)((0, _platformexpress.FilesInterceptor)('attachments', 10, {
        storage: (0, _multer.diskStorage)({
            destination: './temp_uploads',
            filename: (req, file, cb)=>{
                const randomName = Array(32).fill(null).map(()=>Math.round(Math.random() * 16).toString(16)).join('');
                cb(null, `${randomName}${(0, _path.extname)(file.originalname)}`);
            }
        })
    })),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.UploadedFiles)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createdispatchdto.CreateDispatchDto === "undefined" ? Object : _createdispatchdto.CreateDispatchDto,
        Array,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], DispatchController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], DispatchController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Patch)(':id'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updatedispatchdto.UpdateDispatchDto === "undefined" ? Object : _updatedispatchdto.UpdateDispatchDto
    ]),
    _ts_metadata("design:returntype", void 0)
], DispatchController.prototype, "update", null);
_ts_decorate([
    (0, _common.Get)(':id/so'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], DispatchController.prototype, "findDispatchSOs", null);
_ts_decorate([
    (0, _common.Post)(':id/so'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('saleOrderNumber')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DispatchController.prototype, "addDispatchSO", null);
_ts_decorate([
    (0, _common.Delete)('so/:soId'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('soId', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], DispatchController.prototype, "removeDispatchSO", null);
_ts_decorate([
    (0, _common.Get)(':id/pdf'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], DispatchController.prototype, "generatePdf", null);
_ts_decorate([
    (0, _common.Post)(':id/attachments'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    (0, _common.UseInterceptors)((0, _platformexpress.FilesInterceptor)('attachments', 10, {
        storage: (0, _multer.diskStorage)({
            destination: './temp_uploads',
            filename: (req, file, cb)=>{
                const randomName = Array(32).fill(null).map(()=>Math.round(Math.random() * 16).toString(16)).join('');
                cb(null, `${randomName}${(0, _path.extname)(file.originalname)}`);
            }
        })
    })),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.UploadedFiles)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Array
    ]),
    _ts_metadata("design:returntype", void 0)
], DispatchController.prototype, "addAttachments", null);
_ts_decorate([
    (0, _common.Delete)(':id/attachments'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)('fileName')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DispatchController.prototype, "deleteAttachment", null);
_ts_decorate([
    (0, _common.Get)(':id/attachments/:fileName'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER', 'SALES'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Param)('fileName')),
    _ts_param(2, (0, _common.Res)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        String,
        typeof _express.Response === "undefined" ? Object : _express.Response
    ]),
    _ts_metadata("design:returntype", Promise)
], DispatchController.prototype, "downloadDispatchAttachment", null);
DispatchController = _ts_decorate([
    (0, _swagger.ApiTags)('Dispatch'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('dispatch'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _dispatchservice.DispatchService === "undefined" ? Object : _dispatchservice.DispatchService
    ])
], DispatchController);

//# sourceMappingURL=dispatch.controller.js.map