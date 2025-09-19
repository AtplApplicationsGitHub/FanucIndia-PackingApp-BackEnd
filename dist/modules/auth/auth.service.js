"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthService", {
    enumerable: true,
    get: function() {
        return AuthService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _bcryptjs = /*#__PURE__*/ _interop_require_wildcard(require("bcryptjs"));
const _jwt = require("@nestjs/jwt");
const _logger = require("../../common/logger");
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
let AuthService = class AuthService {
    async signup(dto, req) {
        const email = dto.email.toLowerCase();
        const existing = await this.prisma.user.findUnique({
            where: {
                email
            }
        });
        if (existing) {
            (0, _logger.logAuthFailure)({
                code: 'USER_ALREADY_EXISTS',
                message: 'Email already in use',
                ip: req.ip ?? 'unknown',
                requestId: String(req.headers['x-request-id'] ?? '')
            });
            throw new _common.ConflictException({
                code: 'USER_ALREADY_EXISTS',
                message: 'Email already in use'
            });
        }
        const hash = await _bcryptjs.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email,
                password: hash,
                role: dto.role ?? 'SALES'
            }
        });
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };
    }
    async login(dto, req) {
        const email = dto.email.toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: {
                email
            }
        });
        if (!user) {
            (0, _logger.logAuthFailure)({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials',
                ip: req.ip ?? 'unknown',
                requestId: String(req.headers['x-request-id'] ?? '')
            });
            throw new _common.UnauthorizedException({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials'
            });
        }
        const valid = await _bcryptjs.compare(dto.password, user.password);
        if (!valid) {
            (0, _logger.logAuthFailure)({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials',
                ip: req.ip ?? 'unknown',
                userId: String(user.id),
                requestId: String(req.headers['x-request-id'] ?? '')
            });
            throw new _common.UnauthorizedException({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials'
            });
        }
        const token = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        });
        return {
            accessToken: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    }
    async checkEmailExists(email) {
        if (!email) return false;
        const user = await this.prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
            },
            select: {
                id: true
            }
        });
        return !!user;
    }
    constructor(prisma, jwtService){
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
};
AuthService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService
    ])
], AuthService);

//# sourceMappingURL=auth.service.js.map