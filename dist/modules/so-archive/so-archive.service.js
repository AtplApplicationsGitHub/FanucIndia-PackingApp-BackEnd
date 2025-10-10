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
        const archivedFiles = await this.prisma.eRP_Material_FileArchive.findMany({
            where: {
                saleOrderNumber
            }
        });
        for (const file of archivedFiles){
            try {
                if (file.sftpPath) {
                    await this.sftp.delete(file.sftpPath);
                }
            } catch (error) {
                console.warn(`Failed to delete SFTP file ${file.sftpPath}:`, error);
            }
        }
        return this.prisma.$transaction(async (tx)=>{
            const dispatchSOArchives = await tx.dispatch_SOArchive.findMany({
                where: {
                    saleOrderNumber
                }
            });
            const dispatchIds = dispatchSOArchives.map((d)=>d.dispatchId);
            await tx.dispatch_SOArchive.deleteMany({
                where: {
                    saleOrderNumber
                }
            });
            for (const dispatchId of dispatchIds){
                const remainingLinks = await tx.dispatch_SOArchive.count({
                    where: {
                        dispatchId: dispatchId
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
            return {
                success: true,
                message: `Archived Sales Order ${saleOrderNumber} has been permanently deleted.`
            };
        });
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