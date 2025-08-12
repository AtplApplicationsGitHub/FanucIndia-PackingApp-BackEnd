"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpMaterialFileController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const os = __importStar(require("os"));
const crypto_1 = require("crypto");
const roles_decorator_1 = require("../auth/roles.decorator");
const erp_material_file_service_1 = require("./erp-material-file.service");
const create_erp_material_file_dto_1 = require("./dto/create-erp-material-file.dto");
const update_erp_material_file_dto_1 = require("./dto/update-erp-material-file.dto");
const query_erp_material_file_dto_1 = require("./dto/query-erp-material-file.dto");
const sftp_service_1 = require("../sftp/sftp.service");
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024);
function splitExt(name) {
    const i = name.lastIndexOf('.');
    if (i <= 0)
        return { base: name, ext: '' };
    return { base: name.slice(0, i), ext: name.slice(i) };
}
function sanitizeBase(name) {
    return name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}
let ErpMaterialFileController = class ErpMaterialFileController {
    service;
    sftp;
    constructor(service, sftp) {
        this.service = service;
        this.sftp = sftp;
    }
    async list(query) {
        return this.service.list(query);
    }
    async listBySaleOrder(saleOrderNumber) {
        return this.service.listBySaleOrderNumber(saleOrderNumber);
    }
    async get(id) {
        return this.service.get(id);
    }
    async create(dto) {
        return this.service.create(dto);
    }
    async update(id, dto) {
        return this.service.update(id, dto);
    }
    async remove(id) {
        return this.service.remove(id);
    }
    async download(id, res) {
        const row = await this.service.get(id);
        try {
            const data = await this.sftp.getStream(row.sftpPath);
            res.setHeader('Content-Type', row.mimeType ?? 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.fileName)}"`);
            if (row.fileSizeBytes != null) {
                res.setHeader('Content-Length', String(row.fileSizeBytes));
            }
            if (Buffer.isBuffer(data))
                return res.end(data);
            data.pipe(res);
        }
        catch {
            res.status(404).send('File not found');
        }
    }
    async upload(files, saleOrderNumber, description) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files received');
        }
        return this.service.uploadAndCreate(files, {
            saleOrderNumber: saleOrderNumber?.trim() || null,
            description: description?.trim() || null,
        });
    }
};
exports.ErpMaterialFileController = ErpMaterialFileController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('sales', 'admin'),
    (0, swagger_1.ApiOperation)({
        summary: 'List ERP material files with pagination, search & filters',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_erp_material_file_dto_1.QueryErpMaterialFileDto]),
    __metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('by-sale-order/:saleOrderNumber'),
    (0, roles_decorator_1.Roles)('sales', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'List files by exact sale order number' }),
    (0, swagger_1.ApiParam)({ name: 'saleOrderNumber', type: String }),
    __param(0, (0, common_1.Param)('saleOrderNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "listBySaleOrder", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('sales', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a file record by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('sales', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a file record (metadata only)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_erp_material_file_dto_1.CreateErpMaterialFileDto]),
    __metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)('sales', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a file record' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_erp_material_file_dto_1.UpdateErpMaterialFileDto]),
    __metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('sales', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a file record' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    (0, roles_decorator_1.Roles)('sales', 'admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Stream file content (inline if supported)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "download", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, roles_decorator_1.Roles)('sales', 'admin'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload one or more files to SFTP and create DB rows',
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 20, {
        storage: (0, multer_1.diskStorage)({
            destination: os.tmpdir(),
            filename: (_req, file, cb) => {
                const { base, ext } = splitExt(file.originalname);
                const safeBase = sanitizeBase(base);
                const ts = Date.now();
                const id = (0, crypto_1.randomUUID)();
                cb(null, `${safeBase}__${ts}_${id}${ext}`);
            },
        }),
        limits: { fileSize: MAX_UPLOAD_BYTES },
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)('saleOrderNumber')),
    __param(2, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String, String]),
    __metadata("design:returntype", Promise)
], ErpMaterialFileController.prototype, "upload", null);
exports.ErpMaterialFileController = ErpMaterialFileController = __decorate([
    (0, swagger_1.ApiTags)('erp-material-files'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: 'v1/erp-material-files', version: '1' }),
    __metadata("design:paramtypes", [erp_material_file_service_1.ErpMaterialFileService,
        sftp_service_1.SftpService])
], ErpMaterialFileController);
//# sourceMappingURL=erp-material-file.controller.js.map