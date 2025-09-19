"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ErpMaterialFileController", {
    enumerable: true,
    get: function() {
        return ErpMaterialFileController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _platformexpress = require("@nestjs/platform-express");
const _multer = require("multer");
const _os = /*#__PURE__*/ _interop_require_wildcard(require("os"));
const _crypto = require("crypto");
const _rolesdecorator = require("../auth/roles.decorator");
const _erpmaterialfileservice = require("./erp-material-file.service");
const _createerpmaterialfiledto = require("./dto/create-erp-material-file.dto");
const _updateerpmaterialfiledto = require("./dto/update-erp-material-file.dto");
const _queryerpmaterialfiledto = require("./dto/query-erp-material-file.dto");
const _express = require("express");
const _sftpservice = require("../sftp/sftp.service");
const _authrequesttype = require("../auth/types/auth-request.type");
const _jwtauthguard = require("../auth/jwt-auth.guard");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
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
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);
function splitExt(name) {
    const i = name.lastIndexOf('.');
    if (i <= 0) return {
        base: name,
        ext: ''
    };
    return {
        base: name.slice(0, i),
        ext: name.slice(i)
    };
}
function sanitizeBase(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}
let ErpMaterialFileController = class ErpMaterialFileController {
    async list(query, req) {
        const { userId, role } = req.user;
        return this.service.list(query, userId, role);
    }
    async listBySaleOrder(saleOrderNumber, req) {
        const { userId, role } = req.user;
        return this.service.listBySaleOrderNumber(saleOrderNumber, userId, role);
    }
    async get(id, req) {
        const { userId, role } = req.user;
        return this.service.get(id, userId, role);
    }
    async create(dto) {
        return this.service.create(dto);
    }
    async update(id, dto, req) {
        const { userId, role } = req.user;
        return this.service.update(id, dto, userId, role);
    }
    async remove(id, req) {
        const { userId, role } = req.user;
        return this.service.remove(id, userId, role);
    }
    async download(id, res, req) {
        const { userId, role } = req.user;
        const row = await this.service.get(id, userId, role);
        try {
            const data = await this.sftp.getStream(row.sftpPath);
            res.setHeader('Content-Type', row.mimeType ?? 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.fileName)}"`);
            if (row.fileSizeBytes != null) {
                res.setHeader('Content-Length', String(row.fileSizeBytes));
            }
            if (Buffer.isBuffer(data)) return res.end(data);
            data.pipe(res);
        } catch  {
            res.status(404).send('File not found');
        }
    }
    async upload(files, saleOrderNumber, description, req) {
        if (!files || files.length === 0) {
            throw new _common.BadRequestException('No files received');
        }
        if (!req?.user) {
            throw new _common.BadRequestException('User information not available');
        }
        const { userId, role } = req.user;
        return this.service.uploadAndCreate(files, {
            saleOrderNumber: saleOrderNumber?.trim() || null,
            description: description?.trim() || null
        }, userId, role);
    }
    constructor(service, sftp){
        this.service = service;
        this.sftp = sftp;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _rolesdecorator.Roles)('SALES', 'ADMIN', 'USER'),
    (0, _swagger.ApiOperation)({
        summary: 'List ERP material files with pagination, search & filters'
    }),
    _ts_param(0, (0, _common.Query)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _queryerpmaterialfiledto.QueryErpMaterialFileDto === "undefined" ? Object : _queryerpmaterialfiledto.QueryErpMaterialFileDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "list", null);
_ts_decorate([
    (0, _common.Get)('by-sale-order/:saleOrderNumber'),
    (0, _rolesdecorator.Roles)('SALES', 'ADMIN', 'USER'),
    (0, _swagger.ApiOperation)({
        summary: 'List files by exact sale order number'
    }),
    (0, _swagger.ApiParam)({
        name: 'saleOrderNumber',
        type: String
    }),
    _ts_param(0, (0, _common.Param)('saleOrderNumber')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "listBySaleOrder", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _rolesdecorator.Roles)('SALES', 'ADMIN', 'USER'),
    (0, _swagger.ApiOperation)({
        summary: 'Get a file record by ID'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "get", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _rolesdecorator.Roles)('SALES', 'ADMIN', 'USER'),
    (0, _swagger.ApiOperation)({
        summary: 'Create a file record (metadata only)'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createerpmaterialfiledto.CreateErpMaterialFileDto === "undefined" ? Object : _createerpmaterialfiledto.CreateErpMaterialFileDto
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _rolesdecorator.Roles)('SALES', 'ADMIN', 'USER'),
    (0, _swagger.ApiOperation)({
        summary: 'Update a file record'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _updateerpmaterialfiledto.UpdateErpMaterialFileDto === "undefined" ? Object : _updateerpmaterialfiledto.UpdateErpMaterialFileDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _rolesdecorator.Roles)('SALES', 'ADMIN', 'USER'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete a file record'
    }),
    (0, _swagger.ApiParam)({
        name: 'id',
        type: Number
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "remove", null);
_ts_decorate([
    (0, _common.Get)(':id/download'),
    (0, _rolesdecorator.Roles)('SALES', 'ADMIN', 'USER'),
    (0, _swagger.ApiOperation)({
        summary: 'Stream file content (inline if supported)'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Res)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _express.Response === "undefined" ? Object : _express.Response,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "download", null);
_ts_decorate([
    (0, _common.Post)('upload'),
    (0, _rolesdecorator.Roles)('SALES', 'ADMIN', 'USER'),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    (0, _swagger.ApiOperation)({
        summary: 'Upload one or more files to SFTP and create DB rows'
    }),
    (0, _common.UseInterceptors)((0, _platformexpress.FilesInterceptor)('files', 20, {
        storage: (0, _multer.diskStorage)({
            destination: _os.tmpdir(),
            filename: (_req, file, cb)=>{
                const { base, ext } = splitExt(file.originalname);
                const safeBase = sanitizeBase(base);
                const ts = Date.now();
                const id = (0, _crypto.randomUUID)();
                cb(null, `${safeBase}__${ts}_${id}${ext}`);
            }
        }),
        limits: {
            fileSize: MAX_UPLOAD_BYTES
        }
    })),
    _ts_param(0, (0, _common.UploadedFiles)()),
    _ts_param(1, (0, _common.Body)('saleOrderNumber')),
    _ts_param(2, (0, _common.Body)('description')),
    _ts_param(3, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Array,
        String,
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "upload", null);
ErpMaterialFileController = _ts_decorate([
    (0, _swagger.ApiTags)('erp-material-files'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)({
        path: 'v1/erp-material-files',
        version: '1'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _erpmaterialfileservice.ErpMaterialFileService === "undefined" ? Object : _erpmaterialfileservice.ErpMaterialFileService,
        typeof _sftpservice.SftpService === "undefined" ? Object : _sftpservice.SftpService
    ])
], ErpMaterialFileController);

//# sourceMappingURL=erp-material-file.controller.js.map