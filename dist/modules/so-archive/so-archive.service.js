"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoArchiveService", {
    enumerable: true,
    get: function() {
        return SoArchiveService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _sftpservice = require("../sftp/sftp.service");
const _client = require("@prisma/client");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
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
let SoArchiveService = class SoArchiveService {
    async archive(saleOrderNumber) {
        const so = await this.prisma.salesOrder.findUnique({
            where: {
                saleOrderNumber
            },
            include: {
                materialData: true,
                materialFilesByNumber: true,
                Dispatch_SO: {
                    include: {
                        dispatch: {
                            include: {
                                _count: {
                                    select: {
                                        dispatchSOs: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!so) {
            throw new _common.NotFoundException(`Sales Order ${saleOrderNumber} not found.`);
        }
        if (so.status !== 'Dispatched') {
            throw new _common.BadRequestException(`Sales Order ${saleOrderNumber} cannot be archived as its status is not 'Dispatched'.`);
        }
        return this.prisma.$transaction(async (tx)=>{
            const { id, updatedAt, materialData, materialFilesByNumber, Dispatch_SO, ...soData } = so;
            await tx.salesOrderArchive.create({
                data: soData
            });
            if (materialData.length > 0) {
                await tx.eRP_Material_DataArchive.createMany({
                    data: materialData.map(({ ID, ...d })=>d)
                });
            }
            if (materialFilesByNumber.length > 0) {
                await tx.eRP_Material_FileArchive.createMany({
                    data: materialFilesByNumber.map(({ ID, updatedAt, ...f })=>f)
                });
            }
            const dispatches = Dispatch_SO.map((dso)=>dso.dispatch);
            if (dispatches.length > 0) {
                await tx.dispatchArchive.createMany({
                    data: dispatches.map(({ updatedAt, _count, ...d })=>({
                            ...d,
                            customerName: d.customerName,
                            attachments: d.attachments ?? _client.Prisma.DbNull
                        })),
                    skipDuplicates: true
                });
                await tx.dispatch_SOArchive.createMany({
                    data: Dispatch_SO.map(({ id, dispatch, ...dso })=>dso)
                });
            }
            await tx.eRP_Material_File.deleteMany({
                where: {
                    saleOrderNumber
                }
            });
            await tx.eRP_Material_Data.deleteMany({
                where: {
                    saleOrderNumber
                }
            });
            await tx.dispatch_SO.deleteMany({
                where: {
                    saleOrderNumber
                }
            });
            for (const dispatch of dispatches){
                const totalSOsLinked = dispatch._count.dispatchSOs;
                if (totalSOsLinked <= 1) {
                    await tx.dispatch.delete({
                        where: {
                            id: dispatch.id
                        }
                    });
                }
            }
            await tx.salesOrder.delete({
                where: {
                    saleOrderNumber
                }
            });
            return {
                success: true,
                message: `Sales Order ${saleOrderNumber} has been successfully archived.`
            };
        });
    }
    async delete(saleOrderNumber) {
        const archivedSo = await this.prisma.salesOrderArchive.findFirst({
            where: {
                saleOrderNumber
            }
        });
        if (!archivedSo) {
            throw new _common.NotFoundException(`Archived Sales Order ${saleOrderNumber} not found.`);
        }
        // 1. Get lists of files AND directories to delete BEFORE the transaction
        // Get material files and directories
        const materialFiles = await this.prisma.eRP_Material_FileArchive.findMany({
            where: {
                saleOrderNumber
            },
            select: {
                sftpPath: true,
                sftpDir: true
            }
        });
        // Get dispatch file and directory paths for dispatches that will be deleted
        const dispatchSOArchives = await this.prisma.dispatch_SOArchive.findMany({
            where: {
                saleOrderNumber
            },
            select: {
                dispatchId: true
            }
        });
        const dispatchIds = [
            ...new Set(dispatchSOArchives.map((d)=>d.dispatchId))
        ];
        const dispatchArchivesToDelete = [];
        for (const dispatchId of dispatchIds){
            const remainingLinks = await this.prisma.dispatch_SOArchive.count({
                where: {
                    dispatchId: dispatchId,
                    NOT: {
                        saleOrderNumber: saleOrderNumber
                    }
                }
            });
            if (remainingLinks === 0) {
                const dispatchArchive = await this.prisma.dispatchArchive.findUnique({
                    where: {
                        id: dispatchId
                    },
                    select: {
                        attachments: true
                    }
                });
                if (dispatchArchive) {
                    dispatchArchivesToDelete.push(dispatchArchive);
                }
            }
        }
        const dispatchFiles = dispatchArchivesToDelete.flatMap((d)=>d.attachments).filter((att)=>att && att.path).map((att)=>({
                sftpPath: att.path,
                sftpDir: att.path.substring(0, att.path.lastIndexOf('/'))
            }));
        const allFilesToDelete = [
            ...materialFiles,
            ...dispatchFiles
        ];
        const uniqueDirectoriesToDelete = [
            ...new Set(allFilesToDelete.map((f)=>f.sftpDir).filter(Boolean))
        ];
        // 2. Run all database deletions within a single, atomic transaction
        await this.prisma.$transaction(async (tx)=>{
            for (const dispatchId of dispatchIds){
                const remainingLinks = await tx.dispatch_SOArchive.count({
                    where: {
                        dispatchId: dispatchId,
                        NOT: {
                            saleOrderNumber: saleOrderNumber
                        }
                    }
                });
                if (remainingLinks === 0) {
                    await tx.dispatchArchive.delete({
                        where: {
                            id: dispatchId
                        }
                    });
                }
            }
            await tx.dispatch_SOArchive.deleteMany({
                where: {
                    saleOrderNumber
                }
            });
            await tx.eRP_Material_FileArchive.deleteMany({
                where: {
                    saleOrderNumber
                }
            });
            await tx.eRP_Material_DataArchive.deleteMany({
                where: {
                    saleOrderNumber
                }
            });
            await tx.salesOrderArchive.deleteMany({
                where: {
                    saleOrderNumber
                }
            });
        });
        const orderBaseDir = process.env.SFTP_BASE_DIR_ORDER || '';
        const dispatchBaseDir = process.env.SFTP_BASE_DIR_DISPATCH || '';
        const resolvedOrderBase = _path.posix.resolve(orderBaseDir);
        const resolvedDispatchBase = _path.posix.resolve(dispatchBaseDir);
        for (const file of allFilesToDelete){
            try {
                if (file.sftpPath) {
                    const resolvedPath = _path.posix.resolve(file.sftpPath);
                    if (!resolvedPath.startsWith(resolvedOrderBase) && !resolvedPath.startsWith(resolvedDispatchBase)) {
                        console.warn(`Skipping delete: Path ${file.sftpPath} is outside of configured base directories.`);
                        continue;
                    }
                    await this.sftp.delete(file.sftpPath);
                }
            } catch (error) {
                console.warn(`Failed to clean up SFTP file ${file.sftpPath}:`, error);
            }
        }
        for (const dir of uniqueDirectoriesToDelete){
            try {
                if (dir) {
                    const resolvedDir = _path.posix.resolve(dir);
                    if (!resolvedDir.startsWith(resolvedOrderBase) && !resolvedDir.startsWith(resolvedDispatchBase)) {
                        console.warn(`Skipping rmdir: Path ${dir} is outside of configured base directories.`);
                        continue;
                    }
                    await this.sftp.rmdir(dir);
                }
            } catch (error) {
                console.warn(`Failed to clean up SFTP directory ${dir}:`, error);
            }
        }
        return {
            success: true,
            message: `Archived Sales Order ${saleOrderNumber} has been permanently deleted.`
        };
    }
    async downloadArchivedFile(fileId, res) {
        const file = await this.prisma.eRP_Material_FileArchive.findUnique({
            where: {
                ID: fileId
            }
        });
        if (!file) {
            throw new _common.NotFoundException('Archived file not found.');
        }
        try {
            const data = await this.sftp.getStream(file.sftpPath);
            res.setHeader('Content-Type', file.mimeType ?? 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
            if (file.fileSizeBytes) {
                res.setHeader('Content-Length', String(file.fileSizeBytes));
            }
            if (Buffer.isBuffer(data)) {
                return res.end(data);
            }
            data.pipe(res);
        } catch (error) {
            console.error("SFTP download error for archived file:", error);
            res.status(404).send('File not found in storage.');
        }
    }
    constructor(prisma, sftp){
        this.prisma = prisma;
        this.sftp = sftp;
    }
};
SoArchiveService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _sftpservice.SftpService === "undefined" ? Object : _sftpservice.SftpService
    ])
], SoArchiveService);

//# sourceMappingURL=so-archive.service.js.map