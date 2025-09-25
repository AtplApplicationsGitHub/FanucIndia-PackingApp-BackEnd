"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FgStorageController", {
    enumerable: true,
    get: function() {
        return FgStorageController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _fgstorageservice = require("./fg-storage.service");
const _updatefglocationdto = require("./dto/update-fg-location.dto");
const _rolesdecorator = require("../auth/roles.decorator");
const _authrequesttype = require("../auth/types/auth-request.type");
const _jwtauthguard = require("../auth/jwt-auth.guard");
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
let FgStorageController = class FgStorageController {
    assignFgLocation(updateFgLocationDto, req) {
        return this.fgStorageService.assignFgLocation(updateFgLocationDto, req.user);
    }
    constructor(fgStorageService){
        this.fgStorageService = fgStorageService;
    }
};
_ts_decorate([
    (0, _common.Patch)('assign-location'),
    (0, _rolesdecorator.Roles)('USER', 'ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: 'Assign an FG Location to a Sales Order'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'FG Location updated successfully.'
    }),
    (0, _swagger.ApiResponse)({
        status: 403,
        description: 'Forbidden. User does not have permission.'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Sales Order not found.'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _updatefglocationdto.UpdateFgLocationDto === "undefined" ? Object : _updatefglocationdto.UpdateFgLocationDto,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], FgStorageController.prototype, "assignFgLocation", null);
FgStorageController = _ts_decorate([
    (0, _swagger.ApiTags)('FG Storage'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.Controller)('fg-storage'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _fgstorageservice.FgStorageService === "undefined" ? Object : _fgstorageservice.FgStorageService
    ])
], FgStorageController);

//# sourceMappingURL=fg-storage.controller.js.map