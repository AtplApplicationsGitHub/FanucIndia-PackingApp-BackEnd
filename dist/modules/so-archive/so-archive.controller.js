"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoArchiveController", {
    enumerable: true,
    get: function() {
        return SoArchiveController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _soarchiveservice = require("./so-archive.service");
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesguard = require("../auth/roles.guard");
const _rolesdecorator = require("../auth/roles.decorator");
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
let SoArchiveController = class SoArchiveController {
    async archive(soNumber) {
        return this.soArchiveService.archive(soNumber);
    }
    async delete(soNumber) {
        return this.soArchiveService.delete(soNumber);
    }
    constructor(soArchiveService){
        this.soArchiveService = soArchiveService;
    }
};
_ts_decorate([
    (0, _common.Post)(':soNumber/archive'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Archive a dispatched Sales Order'
    }),
    (0, _swagger.ApiParam)({
        name: 'soNumber',
        type: String,
        description: 'The Sales Order Number to archive'
    }),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SoArchiveController.prototype, "archive", null);
_ts_decorate([
    (0, _common.Delete)(':soNumber/delete'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Permanently delete an archived Sales Order'
    }),
    (0, _swagger.ApiParam)({
        name: 'soNumber',
        type: String,
        description: 'The Sales Order Number to delete from archives'
    }),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SoArchiveController.prototype, "delete", null);
SoArchiveController = _ts_decorate([
    (0, _swagger.ApiTags)('so-archive'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard, _rolesguard.RolesGuard),
    (0, _rolesdecorator.Roles)('ADMIN'),
    (0, _common.Controller)('so-archive'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _soarchiveservice.SoArchiveService === "undefined" ? Object : _soarchiveservice.SoArchiveService
    ])
], SoArchiveController);

//# sourceMappingURL=so-archive.controller.js.map