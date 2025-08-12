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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
const jwt_1 = require("@nestjs/jwt");
const logger_1 = require("../../common/logger");
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async signup(dto, req) {
        const email = dto.email.toLowerCase();
        const existing = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            (0, logger_1.logAuthFailure)({
                code: 'USER_ALREADY_EXISTS',
                message: 'Email already in use',
                ip: req.ip ?? 'unknown',
                requestId: String(req.headers['x-request-id'] ?? ''),
            });
            throw new common_1.ConflictException({
                code: 'USER_ALREADY_EXISTS',
                message: 'Email already in use',
            });
        }
        const hash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email,
                password: hash,
                role: dto.role ?? 'sales',
            },
        });
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        };
    }
    async login(dto, req) {
        const email = dto.email.toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            (0, logger_1.logAuthFailure)({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials',
                ip: req.ip ?? 'unknown',
                requestId: String(req.headers['x-request-id'] ?? ''),
            });
            throw new common_1.UnauthorizedException({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials',
            });
        }
        const valid = await bcrypt.compare(dto.password, user.password);
        if (!valid) {
            (0, logger_1.logAuthFailure)({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials',
                ip: req.ip ?? 'unknown',
                userId: String(user.id),
                requestId: String(req.headers['x-request-id'] ?? ''),
            });
            throw new common_1.UnauthorizedException({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials',
            });
        }
        const token = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        });
        return {
            accessToken: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }
    async checkEmailExists(email) {
        if (!email)
            return false;
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true },
        });
        return !!user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map