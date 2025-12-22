"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VehicleEntryService", {
    enumerable: true,
    get: function() {
        return VehicleEntryService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _sftpservice = require("../sftp/sftp.service");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _client = require("@prisma/client");
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
let VehicleEntryService = class VehicleEntryService {
    async create(dto, userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const userName = user?.name || 'System';
        return this.prisma.vehicleEntry.create({
            data: {
                customerName: dto.customerName,
                vehicleNumber: dto.vehicleNumber,
                transporterName: dto.transporterName,
                driverNumber: dto.driverNumber,
                createdBy: userId,
                updatedBy: userName,
                attachments: _client.Prisma.JsonNull
            }
        });
    }
    async uploadAttachments(entryId, files, userId) {
        const entry = await this.prisma.vehicleEntry.findUnique({
            where: {
                id: entryId
            }
        });
        if (!entry) {
            throw new _common.NotFoundException(`Vehicle Entry with ID ${entryId} not found.`);
        }
        const uploadedFiles = entry.attachments || [];
        const remoteDir = _path.posix.join(process.env.SFTP_BASE_DIR_VEHICLE_ENTRY || '', String(entryId));
        try {
            await this.sftpService.ensureDir(remoteDir);
            for (const file of files){
                const remotePath = _path.posix.join(remoteDir, file.originalname);
                await this.sftpService.put(file.buffer, remotePath);
                uploadedFiles.push({
                    fileName: file.originalname,
                    path: remotePath,
                    mimeType: file.mimetype,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                });
            }
            const user = await this.prisma.user.findUnique({
                where: {
                    id: userId
                }
            });
            return await this.prisma.vehicleEntry.update({
                where: {
                    id: entryId
                },
                data: {
                    attachments: uploadedFiles,
                    updatedBy: user?.name || 'System'
                }
            });
        } catch (error) {
            console.error('SFTP Upload Error:', error);
            throw new _common.InternalServerErrorException('Failed to upload attachments');
        }
    }
    async getAttachments(entryId) {
        const entry = await this.prisma.vehicleEntry.findUnique({
            where: {
                id: entryId
            },
            select: {
                attachments: true
            }
        });
        if (!entry) {
            throw new _common.NotFoundException(`Vehicle Entry with ID ${entryId} not found.`);
        }
        return entry.attachments || [];
    }
    async getAttachmentStream(entryId, fileName, res) {
        const entry = await this.prisma.vehicleEntry.findUnique({
            where: {
                id: entryId
            }
        });
        if (!entry) throw new _common.NotFoundException('Entry not found');
        const attachments = entry.attachments || [];
        const fileData = attachments.find((a)=>a.fileName === fileName);
        if (!fileData) throw new _common.NotFoundException('File not found in record');
        try {
            const stream = await this.sftpService.getStream(fileData.path);
            res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            if (Buffer.isBuffer(stream)) return res.end(stream);
            return stream.pipe(res);
        } catch (e) {
            throw new _common.InternalServerErrorException('Could not retrieve file from storage');
        }
    }
    constructor(prisma, sftpService){
        this.prisma = prisma;
        this.sftpService = sftpService;
    }
};
VehicleEntryService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _sftpservice.SftpService === "undefined" ? Object : _sftpservice.SftpService
    ])
], VehicleEntryService);

//# sourceMappingURL=vehicle-entry.service.js.map