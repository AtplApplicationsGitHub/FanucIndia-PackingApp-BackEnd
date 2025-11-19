"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ErpMaterialFileService", {
    enumerable: true,
    get: function() {
        return ErpMaterialFileService;
    }
});
const _common = require("@nestjs/common");
const _client = require("@prisma/client");
const _prismaservice = require("../../prisma.service");
const _sftpservice = require("../sftp/sftp.service");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _crypto = require("crypto");
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
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
async function verifyFileAccess(prisma, fileId, userId, userRole) {
    if (userRole === 'ADMIN' || userRole === 'SALES' || userRole === 'USER') {
        const file = await prisma.eRP_Material_File.findUnique({
            where: {
                ID: fileId
            }
        });
        if (!file) throw new _common.NotFoundException('File not found.');
        return file;
    }
    const file = await prisma.eRP_Material_File.findUnique({
        where: {
            ID: fileId
        },
        include: {
            salesOrderByNumber: true
        }
    });
    if (!file) {
        throw new _common.NotFoundException('File not found.');
    }
    if (!file.salesOrderByNumber || file.salesOrderByNumber.assignedUserId !== userId) {
        throw new _common.ForbiddenException('You do not have permission to access this file.');
    }
    return file;
}
async function verifySaleOrderAccess(prisma, saleOrderNumber, userId, userRole) {
    if (userRole === 'ADMIN' || userRole === 'SALES') {
        const order = await prisma.salesOrder.findUnique({
            where: {
                saleOrderNumber
            }
        });
        if (!order) throw new _common.NotFoundException(`Sales Order ${saleOrderNumber} not found.`);
        return;
    }
    const order = await prisma.salesOrder.findFirst({
        where: {
            saleOrderNumber: saleOrderNumber,
            assignedUserId: userId
        }
    });
    if (!order) {
        throw new _common.ForbiddenException(`You do not have permission to access files for Sales Order ${saleOrderNumber}.`);
    }
}
function sanitize(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function normalizeBigInt(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map((v)=>normalizeBigInt(v));
    if (typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj))out[k] = normalizeBigInt(v);
        return out;
    }
    return obj;
}
let ErpMaterialFileService = class ErpMaterialFileService {
    async list(query, userId, userRole) {
        const { page = 1, limit = 20, search, saleOrderNumber, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const skip = (page - 1) * limit;
        const where = {
            ...saleOrderNumber ? {
                saleOrderNumber
            } : {},
            ...search ? {
                OR: [
                    {
                        fileName: {
                            contains: search
                        }
                    },
                    {
                        description: {
                            contains: search
                        }
                    },
                    {
                        saleOrderNumber: {
                            contains: search
                        }
                    }
                ]
            } : {}
        };
        if (userRole === 'USER') {
            where.salesOrderByNumber = {
                is: {
                    assignedUserId: userId
                }
            };
        }
        const [items, total] = await this.prisma.$transaction([
            this.prisma.eRP_Material_File.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    [sortBy]: sortOrder
                },
                include: {
                    salesOrderByNumber: true
                }
            }),
            this.prisma.eRP_Material_File.count({
                where
            })
        ]);
        return normalizeBigInt({
            items,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    async get(id, userId, userRole) {
        const row = await verifyFileAccess(this.prisma, id, userId, userRole);
        return normalizeBigInt(row);
    }
    async listBySaleOrderNumber(soNumber, userId, userRole) {
        await verifySaleOrderAccess(this.prisma, soNumber, userId, userRole);
        const items = await this.prisma.eRP_Material_File.findMany({
            where: {
                saleOrderNumber: soNumber
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return normalizeBigInt(items);
    }
    async create(_dto) {
        throw new _common.BadRequestException('Direct creation is disabled. Use /v1/erp-material-files/upload to create records.');
    }
    async update(id, dto, userId, userRole) {
        const existing = await verifyFileAccess(this.prisma, id, userId, userRole);
        try {
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                }
            });
            const updated = await this.prisma.eRP_Material_File.update({
                where: {
                    ID: id
                },
                data: {
                    saleOrderNumber: dto.saleOrderNumber !== undefined ? dto.saleOrderNumber : existing.saleOrderNumber,
                    fileName: dto.fileName ?? existing.fileName,
                    description: dto.description !== undefined ? dto.description : existing.description,
                    UpdatedBy: user?.name || 'System',
                    UpdatedDate: new Date()
                }
            });
            return normalizeBigInt(updated);
        } catch (e) {
            if (e instanceof _client.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new _common.ConflictException('Update violates unique constraint (saleOrderNumber, fileName).');
            }
            throw new _common.InternalServerErrorException('Failed to update ERP material file.');
        }
    }
    async remove(id, userId, userRole) {
        const existing = await verifyFileAccess(this.prisma, id, userId, userRole);
        try {
            if (existing.sftpPath) {
                await this.sftp.delete(existing.sftpPath);
            }
        } catch (e) {
            console.warn('SFTP delete failed but proceeding with DB cleanup', e);
        }
        await this.prisma.eRP_Material_File.delete({
            where: {
                ID: id
            }
        });
        return {
            success: true
        };
    }
    async uploadAndCreate(files, opts, userId, userRole) {
        if (opts.saleOrderNumber) {
            await verifySaleOrderAccess(this.prisma, opts.saleOrderNumber, userId, userRole);
        } else if (userRole === 'USER') {
            throw new _common.ForbiddenException('You must specify a Sale Order Number for an order assigned to you.');
        }
        const baseDir = process.env.SFTP_BASE_DIR_ORDER || '';
        const soDir = opts.saleOrderNumber ? sanitize(opts.saleOrderNumber) : 'misc';
        const remoteDir = _path.posix.join(baseDir, soDir);
        const uploads = [];
        const dbRecords = [];
        try {
            // 1. Prepare all data locally (Fast)
            for (const f of files){
                const checksum = await sha256File(f.path);
                const remoteName = f.originalname;
                const remotePath = _path.posix.join(remoteDir, remoteName);
                uploads.push({
                    localPath: f.path,
                    remotePath
                });
                dbRecords.push({
                    saleOrderNumber: opts.saleOrderNumber,
                    fileName: f.originalname,
                    description: opts.description,
                    sftpPath: remotePath,
                    sftpDir: remoteDir,
                    fileSizeBytes: BigInt(f.size),
                    mimeType: f.mimetype,
                    checksumSha256: checksum
                });
            }
            // 2. Upload all files in ONE connection (Fast)
            await this.sftp.uploadBatch(uploads);
            // 3. Create DB records
            const created = [];
            for (const data of dbRecords){
                const row = await this.prisma.eRP_Material_File.create({
                    data
                });
                created.push(row);
            }
            return {
                success: true,
                items: created.map((r)=>({
                        ...r,
                        fileSizeBytes: Number(r.fileSizeBytes)
                    }))
            };
        } catch (e) {
            throw new _common.InternalServerErrorException('Upload failed. ' + (e?.message || ''));
        } finally{
            for (const f of files){
                try {
                    _fs.unlinkSync(f.path);
                } catch  {}
            }
        }
    }
    async uploadAndCreateWithDescriptions(files, opts, userId, userRole) {
        if (opts.saleOrderNumber) {
            await verifySaleOrderAccess(this.prisma, opts.saleOrderNumber, userId, userRole);
        } else if (userRole === 'USER') {
            throw new _common.ForbiddenException('You must specify a Sale Order Number for an order assigned to you.');
        }
        let descriptionMap;
        try {
            descriptionMap = JSON.parse(opts.descriptions);
        } catch (error) {
            throw new _common.BadRequestException('Invalid descriptions JSON.');
        }
        const baseDir = process.env.SFTP_BASE_DIR_ORDER || '';
        const soDir = opts.saleOrderNumber ? sanitize(opts.saleOrderNumber) : 'misc';
        const remoteDir = _path.posix.join(baseDir, soDir);
        const uploads = [];
        const dbRecords = [];
        try {
            const existingDbFiles = opts.saleOrderNumber ? await this.prisma.eRP_Material_File.findMany({
                where: {
                    saleOrderNumber: opts.saleOrderNumber
                },
                select: {
                    fileName: true
                }
            }) : [];
            const existingFileNames = new Set(existingDbFiles.map((f)=>f.fileName));
            for (const f of files){
                const checksum = await sha256File(f.path);
                const description = descriptionMap[f.originalname] || null;
                let finalDbFileName = f.originalname;
                if (opts.saleOrderNumber && existingFileNames.has(finalDbFileName)) {
                    let counter = 1;
                    const { name, ext } = this.splitFileName(f.originalname);
                    do {
                        finalDbFileName = `${name}-${counter}${ext}`;
                        counter++;
                    }while (existingFileNames.has(finalDbFileName))
                }
                existingFileNames.add(finalDbFileName);
                const remotePath = _path.posix.join(remoteDir, finalDbFileName);
                uploads.push({
                    localPath: f.path,
                    remotePath
                });
                dbRecords.push({
                    saleOrderNumber: opts.saleOrderNumber,
                    fileName: finalDbFileName,
                    description: description,
                    sftpPath: remotePath,
                    sftpDir: remoteDir,
                    fileSizeBytes: BigInt(f.size),
                    mimeType: f.mimetype,
                    checksumSha256: checksum
                });
            }
            await this.sftp.uploadBatch(uploads);
            const created = [];
            for (const data of dbRecords){
                const row = await this.prisma.eRP_Material_File.create({
                    data
                });
                created.push(row);
            }
            return {
                success: true,
                items: created.map((r)=>({
                        ...r,
                        fileSizeBytes: Number(r.fileSizeBytes)
                    }))
            };
        } catch (e) {
            throw new _common.InternalServerErrorException('Upload failed. ' + (e?.message || ''));
        } finally{
            for (const f of files){
                try {
                    _fs.unlinkSync(f.path);
                } catch  {}
            }
        }
    }
    splitFileName(filename) {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex === -1 || lastDotIndex === 0) {
            return {
                name: filename,
                ext: ''
            };
        }
        return {
            name: filename.substring(0, lastDotIndex),
            ext: filename.substring(lastDotIndex)
        };
    }
    constructor(prisma, sftp){
        this.prisma = prisma;
        this.sftp = sftp;
    }
};
ErpMaterialFileService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _sftpservice.SftpService === "undefined" ? Object : _sftpservice.SftpService
    ])
], ErpMaterialFileService);
async function sha256File(localPath) {
    return new Promise((resolve, reject)=>{
        const hash = (0, _crypto.createHash)('sha256');
        const stream = _fs.createReadStream(localPath);
        stream.on('error', reject);
        stream.on('data', (d)=>hash.update(d));
        stream.on('end', ()=>resolve(hash.digest('hex')));
    });
}

//# sourceMappingURL=erp-material-file.service.js.map