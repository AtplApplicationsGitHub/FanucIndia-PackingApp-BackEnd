"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ErpMaterialImporterController", {
    enumerable: true,
    get: function() {
        return ErpMaterialImporterController;
    }
});
const _common = require("@nestjs/common");
const _platformexpress = require("@nestjs/platform-express");
const _erpmaterialimporterservice = require("./erp-material-importer.service");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
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
let ErpMaterialImporterController = class ErpMaterialImporterController {
    async uploadFile(file, saleOrderNumber) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded.');
        }
        return this.service.processFile(file, saleOrderNumber);
    }
    constructor(service){
        this.service = service;
    }
};
_ts_decorate([
    (0, _common.Post)('upload'),
    (0, _rolesdecorator.Roles)('ADMIN', 'USER'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file')),
    (0, _swagger.ApiOperation)({
        summary: 'Upload and process an ERP material file'
    }),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    (0, _swagger.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                },
                saleOrderNumber: {
                    type: 'string',
                    description: 'The expected Sale Order Number to validate against the file content.',
                    nullable: true
                }
            }
        }
    }),
    _ts_param(0, (0, _common.UploadedFile)()),
    _ts_param(1, (0, _common.Body)('saleOrderNumber')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ErpMaterialImporterController.prototype, "uploadFile", null);
ErpMaterialImporterController = _ts_decorate([
    (0, _swagger.ApiTags)('ERP Material Importer'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('erp-material-importer'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _erpmaterialimporterservice.ErpMaterialImporterService === "undefined" ? Object : _erpmaterialimporterservice.ErpMaterialImporterService
    ])
], ErpMaterialImporterController);

//# sourceMappingURL=erp-material-importer.controller.js.map