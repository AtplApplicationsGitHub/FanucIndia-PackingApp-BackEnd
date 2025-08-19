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
exports.ErpMaterialFileService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma.service");
const sftp_service_1 = require("../sftp/sftp.service");
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
async function verifyFileAccess(prisma, fileId, userId, userRole) {
    if (userRole === 'admin' || userRole === 'sales') {
        const file = await prisma.eRP_Material_File.findUnique({ where: { ID: fileId } });
        if (!file)
            throw new common_1.NotFoundException('File not found.');
        return file;
    }
    const file = await prisma.eRP_Material_File.findUnique({
        where: { ID: fileId },
        include: {
            salesOrderByNumber: true,
        },
    });
    if (!file) {
        throw new common_1.NotFoundException('File not found.');
    }
    if (!file.salesOrderByNumber || file.salesOrderByNumber.assignedUserId !== userId) {
        throw new common_1.ForbiddenException('You do not have permission to access this file.');
    }
    return file;
}
async function verifySaleOrderAccess(prisma, saleOrderNumber, userId, userRole) {
    if (userRole === 'admin' || userRole === 'sales') {
        const order = await prisma.salesOrder.findUnique({ where: { saleOrderNumber } });
        if (!order)
            throw new common_1.NotFoundException(`Sales Order ${saleOrderNumber} not found.`);
        return;
    }
    const order = await prisma.salesOrder.findFirst({
        where: {
            saleOrderNumber: saleOrderNumber,
            assignedUserId: userId,
        },
    });
    if (!order) {
        throw new common_1.ForbiddenException(`You do not have permission to access files for Sales Order ${saleOrderNumber}.`);
    }
}
function sanitize(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function normalizeBigInt(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === 'bigint')
        return Number(obj);
    if (Array.isArray(obj))
        return obj.map((v) => normalizeBigInt(v));
    if (typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj))
            out[k] = normalizeBigInt(v);
        return out;
    }
    return obj;
}
let ErpMaterialFileService = class ErpMaterialFileService {
    prisma;
    sftp;
    constructor(prisma, sftp) {
        this.prisma = prisma;
        this.sftp = sftp;
    }
    async list(query, userId, userRole) {
        const { page = 1, limit = 20, search, saleOrderNumber, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const skip = (page - 1) * limit;
        const where = {
            ...(saleOrderNumber ? { saleOrderNumber } : {}),
            ...(search
                ? {
                    OR: [
                        { fileName: { contains: search } },
                        { description: { contains: search } },
                        { saleOrderNumber: { contains: search } },
                    ],
                }
                : {}),
        };
        if (userRole === 'user') {
            where.salesOrderByNumber = {
                is: {
                    assignedUserId: userId,
                }
            };
        }
        const [items, total] = await this.prisma.$transaction([
            this.prisma.eRP_Material_File.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    salesOrderByNumber: true,
                },
            }),
            this.prisma.eRP_Material_File.count({ where }),
        ]);
        return normalizeBigInt({
            items,
            meta: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    }
    async get(id, userId, userRole) {
        const row = await verifyFileAccess(this.prisma, id, userId, userRole);
        return normalizeBigInt(row);
    }
    async listBySaleOrderNumber(soNumber, userId, userRole) {
        await verifySaleOrderAccess(this.prisma, soNumber, userId, userRole);
        const items = await this.prisma.eRP_Material_File.findMany({
            where: { saleOrderNumber: soNumber },
            orderBy: { createdAt: 'desc' },
        });
        return normalizeBigInt(items);
    }
    async create(_dto) {
        throw new common_1.BadRequestException('Direct creation is disabled. Use /v1/erp-material-files/upload to create records.');
    }
    async update(id, dto, userId, userRole) {
        const existing = await verifyFileAccess(this.prisma, id, userId, userRole);
        try {
            const updated = await this.prisma.eRP_Material_File.update({
                where: { ID: id },
                data: {
                    saleOrderNumber: dto.saleOrderNumber !== undefined
                        ? dto.saleOrderNumber
                        : existing.saleOrderNumber,
                    fileName: dto.fileName ?? existing.fileName,
                    description: dto.description !== undefined
                        ? dto.description
                        : existing.description,
                },
            });
            return normalizeBigInt(updated);
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                throw new common_1.ConflictException('Update violates unique constraint (saleOrderNumber, fileName).');
            }
            throw new common_1.InternalServerErrorException('Failed to update ERP material file.');
        }
    }
    async remove(id, userId, userRole) {
        const existing = await verifyFileAccess(this.prisma, id, userId, userRole);
        try {
            if (existing.sftpPath) {
                await this.sftp.delete(existing.sftpPath);
            }
        }
        catch (e) {
            console.warn('SFTP delete failed but proceeding with DB cleanup', e);
        }
        await this.prisma.eRP_Material_File.delete({ where: { ID: id } });
        return { success: true };
    }
    async uploadAndCreate(files, opts, userId, userRole) {
        if (opts.saleOrderNumber) {
            await verifySaleOrderAccess(this.prisma, opts.saleOrderNumber, userId, userRole);
        }
        else if (userRole === 'user') {
            throw new common_1.ForbiddenException("You must specify a Sale Order Number for an order assigned to you.");
        }
        const baseDir = process.env.SFTP_BASE_DIR || '/fanuc/order-attachments';
        const soDir = opts.saleOrderNumber
            ? sanitize(opts.saleOrderNumber)
            : 'misc';
        const remoteDir = path.posix.join(baseDir, soDir);
        const created = [];
        try {
            for (const f of files) {
                const checksum = await sha256File(f.path);
                const remoteName = f.filename;
                const remotePath = path.posix.join(remoteDir, remoteName);
                await this.sftp.put(f.path, remotePath);
                const row = await this.prisma.eRP_Material_File.create({
                    data: {
                        saleOrderNumber: opts.saleOrderNumber,
                        fileName: f.originalname,
                        description: opts.description,
                        sftpPath: remotePath,
                        sftpDir: remoteDir,
                        fileSizeBytes: BigInt(f.size),
                        mimeType: f.mimetype,
                        checksumSha256: checksum,
                    },
                });
                created.push(row);
            }
            return {
                success: true,
                items: created.map((r) => ({
                    ...r,
                    fileSizeBytes: Number(r.fileSizeBytes),
                })),
            };
        }
        catch (e) {
            throw new common_1.InternalServerErrorException('Upload failed. ' + (e?.message || ''));
        }
        finally {
            for (const f of files) {
                try {
                    fs.unlinkSync(f.path);
                }
                catch { }
            }
        }
    }
};
exports.ErpMaterialFileService = ErpMaterialFileService;
exports.ErpMaterialFileService = ErpMaterialFileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sftp_service_1.SftpService])
], ErpMaterialFileService);
async function sha256File(localPath) {
    return new Promise((resolve, reject) => {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = fs.createReadStream(localPath);
        stream.on('error', reject);
        stream.on('data', (d) => hash.update(d));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}
//# sourceMappingURL=erp-material-file.service.js.map