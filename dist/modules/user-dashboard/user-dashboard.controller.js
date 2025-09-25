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
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + _path.extname(file.originalname));
        }
    })
};
let UserDashboardController = class UserDashboardController {
    getAssignedOrders(req) {
        const userId = req.user.userId;
        return this.userDashboardService.findAssignedOrders(userId);
    }
    getAssignedOrdersSummary(req) {
        const userId = req.user.userId;
        return this.userDashboardService.getAssignedOrdersSummary(userId);
    }
    async getOrderDetails(id, req) {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const order = await this.userDashboardService.findOrderById(id, userId, userRole);
        if (!order) {
            throw new _common.NotFoundException('Sales order not found or you do not have permission to view it.');
        }
        return order;
    }
    async downloadOrderDetails(id, req) {
        const { userId, role } = req.user;
        return this.userDashboardService.downloadOrderDetails(id, userId, role);
    }
    async downloadOrderDetailsBySoNumber(soNumber, req) {
        const { userId, role } = req.user;
        return this.userDashboardService.downloadOrderDetailsBySoNumber(soNumber, userId, role);
    }
    async uploadOrderDetails(id, req, files) {
        if (!files.data || !files.data[0]) {
            throw new _common.BadRequestException('No data file uploaded.');
        }
        const { userId, role } = req.user;
        const dataFile = files.data[0];
        const attachments = files.attachments || [];
        try {
            const fileContent = _fs.readFileSync(dataFile.path, 'utf8').trim();
            const parsedArray = JSON.parse(fileContent);
            _fs.unlinkSync(dataFile.path);
            const jsonData = {
                materials: parsedArray
            };
            return this.userDashboardService.uploadOrderDetails(id, userId, role, jsonData, attachments);
        } catch (error) {
            console.error('JSON Parsing or File Read Error:', error);
            throw new _common.BadRequestException('Invalid JSON data file.');
        }
    }
    async uploadOrderDetailsBySoNumber(soNumber, req, files) {
        if (!files.data || !files.data[0]) {
            throw new _common.BadRequestException('No data file uploaded.');
        }
        const { userId, role } = req.user;
        const dataFile = files.data[0];
        const attachments = files.attachments || [];
        try {
            const fileContent = _fs.readFileSync(dataFile.path, 'utf8').trim();
            const parsedArray = JSON.parse(fileContent);
            _fs.unlinkSync(dataFile.path);
            const jsonData = {
                materials: parsedArray
            };
            return this.userDashboardService.uploadOrderDetailsBySoNumber(soNumber, userId, role, jsonData, attachments);
        } catch (error) {
            console.error('JSON Parsing or File Read Error:', error);
            throw new _common.BadRequestException('Invalid JSON data file.');
        }
    }
    constructor(userDashboardService){
        this.userDashboardService = userDashboardService;
    }
};
_ts_decorate([
    (0, _common.Get)('orders'),
    (0, _rolesdecorator.Roles)('USER'),
    (0, _swagger.ApiOperation)({
        summary: "Get all sales orders assigned to the logged-in user"
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Assigned orders returned successfully'
    }),
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
    (0, _swagger.ApiOperation)({
        summary: "Get a summary of sales orders assigned to the logged-in user"
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Assigned orders summary returned successfully'
    }),
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
        summary: "Get details for a specific sales order by ID"
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
    (0, _rolesdecorator.Roles)('USER'),
    (0, _swagger.ApiOperation)({
        summary: "Download material details using the Order ID"
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Material details returned successfully'
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
], UserDashboardController.prototype, "downloadOrderDetails", null);
_ts_decorate([
    (0, _common.Get)('orders/son/:soNumber/download-details'),
    (0, _rolesdecorator.Roles)('USER', 'ADMIN'),
    (0, _swagger.ApiOperation)({
        summary: "Download material details using the SO Number"
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Material details returned successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Order not found or access denied'
    }),
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
    (0, _common.Post)('orders/:id/upload-details'),
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
        summary: 'Upload and synchronize material data and attachments using Order ID'
    }),
    (0, _swagger.ApiConsumes)('multipart/form-data'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Req)()),
    _ts_param(2, (0, _common.UploadedFiles)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        typeof _authrequesttype.AuthRequest === "undefined" ? Object : _authrequesttype.AuthRequest,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserDashboardController.prototype, "uploadOrderDetails", null);
_ts_decorate([
    (0, _common.Post)('orders/son/:soNumber/upload-details'),
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
        summary: 'Upload and synchronize material data and attachments using SO Number'
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
], UserDashboardController.prototype, "uploadOrderDetailsBySoNumber", null);
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