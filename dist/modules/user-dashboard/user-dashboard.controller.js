"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserDashboardController", {
    enumerable: true,
    get: function() {
        return UserDashboardController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _platformexpress = require("@nestjs/platform-express");
const _multer = require("multer");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _jwtauthguard = require("../auth/jwt-auth.guard");
const _rolesdecorator = require("../auth/roles.decorator");
const _authrequesttype = require("../auth/types/auth-request.type");
const _userdashboardservice = require("./user-dashboard.service");
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
const storageOptions = {
    storage: (0, _multer.diskStorage)({
        destination: './temp_uploads',
        filename: (req, file, cb)=>{
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + '-' + uniqueSuffix + _path.extname(file.originalname));
        }
    })
};
let UserDashboardController = class UserDashboardController {
    getAssignedOrders(req) {
        return this.userDashboardService.findAssignedOrders(req.user.userId);
    }
    getAssignedOrdersSummary(req) {
        return this.userDashboardService.getAssignedOrdersSummary(req.user.userId);
    }
    // --- NEW ENDPOINT TO FIX 404 ---
    async getOrderDetails(id, req) {
        const { userId, role } = req.user;
        return this.userDashboardService.findOrderById(id, userId, role);
    }
    async downloadOrderDetails(id, req) {
        return this.userDashboardService.downloadOrderDetails(id, req.user.userId, req.user.role);
    }
    async downloadOrderDetailsBySoNumber(soNumber, req) {
        return this.userDashboardService.downloadOrderDetailsBySoNumber(soNumber, req.user.userId, req.user.role);
    }
    // --- All 3 Upload Endpoints ---
    async syncOrderBySoNumber(soNumber, req, files) {
        if (!files.data || !files.data[0]) {
            throw new _common.BadRequestException('Data file is required for sync.');
        }
        const dataFile = files.data[0];
        const attachments = files.attachments || [];
        try {
            const fileContent = _fs.readFileSync(dataFile.path, 'utf8').trim();
            const parsedArray = JSON.parse(fileContent);
            _fs.unlinkSync(dataFile.path);
            const jsonData = {
                materials: parsedArray
            };
            return this.userDashboardService.syncOrderBySoNumber(soNumber, req.user, jsonData, attachments);
        } catch (error) {
            console.error('JSON Parsing or File Read Error:', error);
            throw new _common.BadRequestException('Invalid JSON data file.');
        }
    }
    async uploadDataBySoNumber(soNumber, req, file) {
        if (!file) {
            throw new _common.BadRequestException('No data file uploaded.');
        }
        try {
            const fileContent = _fs.readFileSync(file.path, 'utf8').trim();
            const parsedArray = JSON.parse(fileContent);
            _fs.unlinkSync(file.path);
            const jsonData = {
                materials: parsedArray
            };
            return this.userDashboardService.updateDataBySoNumber(soNumber, req.user, jsonData);
        } catch (error) {
            console.error('JSON Parsing or File Read Error:', error);
            throw new _common.BadRequestException('Invalid JSON data file.');
        }
    }
    async uploadAttachmentsBySoNumber(soNumber, req, files) {
        return this.userDashboardService.uploadAttachmentsBySoNumber(soNumber, req.user, files);
    }
    constructor(userDashboardService){
        this.userDashboardService = userDashboardService;
    }
};
_ts_decorate([
    (0, _common.Get)('orders'),
    (0, _rolesdecorator.Roles)('USER'),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], UserDashboardController.prototype, "getAssignedOrders", null);
_ts_decorate([
    (0, _common.Get)('orders-summary'),
    (0, _rolesdecorator.Roles)('USER'),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", void 0)
], UserDashboardController.prototype, "getAssignedOrdersSummary", null);
_ts_decorate([
    (0, _common.Get)('orders/:id'),
    (0, _rolesdecorator.Roles)('USER', 'ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: 'Get details for a specific sales order by ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Sales order details returned'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Order not found or access denied'
    }),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], UserDashboardController.prototype, "getOrderDetails", null);
_ts_decorate([
    (0, _common.Get)('orders/:id/download-details'),
    (0, _rolesdecorator.Roles)('USER', 'ADMIN'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], UserDashboardController.prototype, "downloadOrderDetails", null);
_ts_decorate([
    (0, _common.Get)('orders/son/:soNumber/download-details'),
    (0, _rolesdecorator.Roles)('USER', 'ADMIN'),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_param(1, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest
    ]),
    _ts_metadata("design:returntype", Promise)
], UserDashboardController.prototype, "downloadOrderDetailsBySoNumber", null);
_ts_decorate([
    (0, _common.Post)('orders/son/:soNumber/sync'),
    (0, _rolesdecorator.Roles)('USER'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileFieldsInterceptor)([
        {
            name: 'data',
            maxCount: 1
        },
        {
            name: 'attachments',
            maxCount: 10
        }
    ], storageOptions)),
    (0, _swagger.ApiOperation)({
        summary: 'Sync both material data and attachments using SO Number'
    }),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_param(1, (0, _common.Req)()),
    _ts_param(2, (0, _common.UploadedFiles)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserDashboardController.prototype, "syncOrderBySoNumber", null);
_ts_decorate([
    (0, _common.Post)('orders/son/:soNumber/data'),
    (0, _rolesdecorator.Roles)('USER'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('data', storageOptions)),
    (0, _swagger.ApiOperation)({
        summary: 'Upload only material data using SO Number'
    }),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_param(1, (0, _common.Req)()),
    _ts_param(2, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest,
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], UserDashboardController.prototype, "uploadDataBySoNumber", null);
_ts_decorate([
    (0, _common.Post)('orders/son/:soNumber/attachments'),
    (0, _rolesdecorator.Roles)('USER'),
    (0, _common.UseInterceptors)((0, _platformexpress.FilesInterceptor)('attachments', 10, storageOptions)),
    (0, _swagger.ApiOperation)({
        summary: 'Upload only attachments using SO Number'
    }),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    _ts_param(0, (0, _common.Param)('soNumber')),
    _ts_param(1, (0, _common.Req)()),
    _ts_param(2, (0, _common.UploadedFiles)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest,
        Array
    ]),
    _ts_metadata("design:returntype", Promise)
], UserDashboardController.prototype, "uploadAttachmentsBySoNumber", null);
UserDashboardController = _ts_decorate([
    (0, _swagger.ApiTags)('User Dashboard'),
    (0, _swagger.ApiBearerAuth)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _common.Controller)('user-dashboard'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userdashboardservice.UserDashboardService === "undefined" ? Object : _userdashboardservice.UserDashboardService
    ])
], UserDashboardController);

//# sourceMappingURL=user-dashboard.controller.js.map