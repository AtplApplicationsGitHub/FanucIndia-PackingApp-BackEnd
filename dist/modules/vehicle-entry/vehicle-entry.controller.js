"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VehicleEntryController", {
    enumerable: true,
    get: function() {
        return VehicleEntryController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _authrequesttype = require("../auth/types/auth-request.type");
const _vehicleentryservice = require("./vehicle-entry.service");
const _createvehicleentrydto = require("./dto/create-vehicle-entry.dto");
const _platformexpress = require("@nestjs/platform-express");
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
let VehicleEntryController = class VehicleEntryController {
    create(dto, req) {
        return this.service.create(dto, req.user.userId);
    }
    uploadAttachments(id, files, req) {
        if (!files || files.length === 0) {
            throw new _common.BadRequestException('No files provided');
        }
        return this.service.uploadAttachments(id, files, req.user.userId);
    }
    constructor(service){
        this.service = service;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    (0, _rolesdecorator.Roles)('USER'),
    (0, _swagger.ApiOperation)({
        summary: 'Save new vehicle entry details'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Entry created successfully.'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createvehicleentrydto.CreateVehicleEntryDto === "undefined" ? Object : _createvehicleentrydto.CreateVehicleEntryDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], VehicleEntryController.prototype, "create", null);
_ts_decorate([
    (0, _common.Post)(':id/attachments'),
    (0, _rolesdecorator.Roles)('USER'),
    (0, _swagger.ApiOperation)({
        summary: 'Upload photos for a vehicle entry'
    }),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    (0, _swagger.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary'
                    }
                }
            }
        }
    }),
    (0, _common.UseInterceptors)((0, _platformexpress.FilesInterceptor)('files', 10)),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.UploadedFiles)()),
    _ts_param(2, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Array,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], VehicleEntryController.prototype, "uploadAttachments", null);
VehicleEntryController = _ts_decorate([
    (0, _swagger.ApiTags)('Vehicle Entry'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('vehicle-entry'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _vehicleentryservice.VehicleEntryService === "undefined" ? Object : _vehicleentryservice.VehicleEntryService
    ])
], VehicleEntryController);

//# sourceMappingURL=vehicle-entry.controller.js.map