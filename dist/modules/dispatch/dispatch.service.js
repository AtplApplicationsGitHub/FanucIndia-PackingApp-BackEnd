"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DispatchService", {
    enumerable: true,
    get: function() {
        return DispatchService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _sftpservice = require("../sftp/sftp.service");
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _client = require("@prisma/client");
const _pdfkit = /*#__PURE__*/ _interop_require_default(require("pdfkit"));
const _os = /*#__PURE__*/ _interop_require_wildcard(require("os"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
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
let DispatchService = class DispatchService {
    safeUnlink(filePath) {
        try {
            const resolvedPath = _path.resolve(filePath);
            const tempDir = _path.resolve(_os.tmpdir());
            if (resolvedPath.startsWith(tempDir)) {
                _fs.unlinkSync(filePath);
            }
        } catch (e) {}
    }
    async getUserName(userId) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        return user?.name || 'System';
    }
    async create(dto, files, userId) {
        const { transporterId: transporterIdString, vehicleNumber, saleOrderNumbers } = dto;
        const vehicleEntry = await this.prisma.vehicleEntry.findFirst({
            where: {
                vehicleNumber: vehicleNumber
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        if (!vehicleEntry) {
            throw new _common.BadRequestException(`Vehicle Number '${vehicleNumber}' not found in Vehicle Entry records.`);
        }
        return this.prisma.$transaction(async (tx)=>{
            const user = await tx.user.findUnique({
                where: {
                    id: userId
                }
            });
            const userName = user?.name || 'System';
            const finalTransporterId = transporterIdString ? parseInt(transporterIdString, 10) : null;
            if (transporterIdString && finalTransporterId !== null && isNaN(finalTransporterId)) {
                throw new _common.BadRequestException('Invalid transporterId provided.');
            }
            if (finalTransporterId !== null) {
                const transporterExists = await tx.transporter.findUnique({
                    where: {
                        id: finalTransporterId
                    }
                });
                if (!transporterExists) {
                    throw new _common.BadRequestException(`Transporter with ID ${finalTransporterId} not found.`);
                }
            }
            const newDispatch = await tx.dispatch.create({
                data: {
                    transporterId: finalTransporterId === null ? undefined : finalTransporterId,
                    vehicleNumber,
                    vehicleEntryId: vehicleEntry.id,
                    createdBy: userId,
                    UpdatedBy: userName,
                    UpdatedDate: new Date(),
                    attachments: _client.Prisma.JsonNull
                }
            });
            const uploadedAttachments = [];
            if (files && files.length > 0) {
                const remoteDir = _path.posix.join(process.env.SFTP_BASE_DIR_DISPATCH || '', String(newDispatch.id));
                await this.sftpService.ensureDir(remoteDir);
                for (const file of files){
                    const remotePath = _path.posix.join(remoteDir, file.originalname);
                    await this.sftpService.put(file.buffer, remotePath);
                    uploadedAttachments.push({
                        fileName: file.originalname,
                        path: remotePath,
                        mimeType: file.mimetype,
                        size: file.size
                    });
                }
                await tx.dispatch.update({
                    where: {
                        id: newDispatch.id
                    },
                    data: {
                        attachments: uploadedAttachments
                    }
                });
            }
            if (saleOrderNumbers && saleOrderNumbers.length > 0) {
                for (const so of saleOrderNumbers){
                    const salesOrder = await tx.salesOrder.findUnique({
                        where: {
                            saleOrderNumber: so
                        }
                    });
                    if (!salesOrder) throw new _common.BadRequestException(`Sale Order ${so} not found.`);
                }
                await tx.dispatch_SO.createMany({
                    data: saleOrderNumbers.map((so)=>({
                            dispatchId: newDispatch.id,
                            saleOrderNumber: so
                        }))
                });
                await tx.salesOrder.updateMany({
                    where: {
                        saleOrderNumber: {
                            in: saleOrderNumbers
                        }
                    },
                    data: {
                        status: 'Dispatched',
                        fgLocation: null
                    }
                });
            }
            return {
                ...newDispatch,
                attachments: uploadedAttachments
            };
        });
    }
    async findAttachmentsByDispatchId(dispatchId) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            },
            select: {
                attachments: true
            }
        });
        if (!dispatch) {
            throw new _common.NotFoundException(`Dispatch with ID ${dispatchId} not found.`);
        }
        return dispatch.attachments || [];
    }
    async createMobileDispatchHeader(dto, userId) {
        const { transporterId, transporterName, vehicleNumber } = dto;
        const vehicleEntry = await this.prisma.vehicleEntry.findFirst({
            where: {
                vehicleNumber: vehicleNumber
            }
        });
        if (!vehicleEntry) {
            throw new _common.BadRequestException(`Vehicle Number '${vehicleNumber}' not found in Vehicle Entry records.`);
        }
        return this.prisma.$transaction(async (tx)=>{
            let finalTransporterId = null;
            let finalTransporterName = null;
            if (transporterId) {
                finalTransporterId = Number(transporterId);
                const transporterExists = await tx.transporter.findUnique({
                    where: {
                        id: finalTransporterId
                    }
                });
                if (!transporterExists) {
                    throw new _common.BadRequestException(`Transporter with ID ${transporterId} not found.`);
                }
            } else if (transporterName) {
                finalTransporterName = transporterName;
            } else {
                finalTransporterId = null;
                finalTransporterName = null;
            }
            const user = await tx.user.findUnique({
                where: {
                    id: userId
                }
            });
            const userName = user?.name || 'System';
            const newDispatch = await tx.dispatch.create({
                data: {
                    transporterId: finalTransporterId,
                    transporterName: finalTransporterName,
                    vehicleNumber,
                    createdBy: userId,
                    UpdatedBy: userName,
                    UpdatedDate: new Date(),
                    attachments: _client.Prisma.JsonNull
                }
            });
            return newDispatch;
        });
    }
    async addMobileAttachments(dispatchId, files) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            }
        });
        if (!dispatch) {
            throw new _common.NotFoundException('Dispatch not found');
        }
        const existingAttachments = dispatch.attachments || [];
        const newAttachments = [];
        const remoteDir = _path.posix.join(process.env.SFTP_BASE_DIR_DISPATCH || '', String(dispatchId));
        try {
            await this.sftpService.ensureDir(remoteDir);
            for (const file of files){
                const remotePath = _path.posix.join(remoteDir, file.originalname);
                await this.sftpService.put(file.buffer, remotePath);
                newAttachments.push({
                    fileName: file.originalname,
                    path: remotePath,
                    mimeType: file.mimetype,
                    size: file.size
                });
            }
        } catch (error) {
            files.forEach((file)=>{
                try {
                    this.safeUnlink(file.path);
                } catch  {}
            });
            throw new _common.InternalServerErrorException('Failed to upload attachments.');
        }
        const allAttachments = [
            ...existingAttachments,
            ...newAttachments
        ];
        return this.prisma.dispatch.update({
            where: {
                id: dispatchId
            },
            data: {
                attachments: allAttachments
            }
        });
    }
    async addMobileDispatchSO(dispatchId, saleOrderNumber, userId) {
        const userName = await this.getUserName(userId);
        return this.prisma.$transaction(async (tx)=>{
            const dispatch = await tx.dispatch.findUnique({
                where: {
                    id: dispatchId
                }
            });
            if (!dispatch) {
                throw new _common.NotFoundException('Dispatch record not found.');
            }
            const salesOrder = await tx.salesOrder.findFirst({
                where: {
                    saleOrderNumber: {
                        equals: saleOrderNumber,
                        mode: 'insensitive'
                    }
                }
            });
            if (!salesOrder) {
                throw new _common.NotFoundException(`Sales Order '${saleOrderNumber}' not found.`);
            }
            const createdLink = await tx.dispatch_SO.create({
                data: {
                    dispatchId,
                    saleOrderNumber: salesOrder.saleOrderNumber
                }
            });
            await tx.dispatch.update({
                where: {
                    id: dispatchId
                },
                data: {
                    UpdatedDate: new Date()
                }
            });
            await tx.salesOrder.update({
                where: {
                    saleOrderNumber: salesOrder.saleOrderNumber
                },
                data: {
                    assignedUserId: null,
                    status: 'Dispatched',
                    fgLocation: null,
                    UpdatedBy: userName,
                    UpdatedDate: new Date()
                }
            });
            await tx.sO_Status_Stepper.updateMany({
                where: {
                    salesOrderNumber: salesOrder.saleOrderNumber,
                    status: "Dispatched"
                },
                data: {
                    createdDateTime: new Date(),
                    updatedBy: userName
                }
            });
            return createdLink;
        });
    }
    async findAll(startDate, endDate) {
        const where = {};
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date(0);
            const end = endDate ? new Date(endDate) : new Date();
            end.setHours(23, 59, 59, 999);
            where.createdAt = {
                gte: start,
                lte: end
            };
        }
        const dispatches = await this.prisma.dispatch.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                transporterId: true,
                transporterName: true,
                vehicleNumber: true,
                attachments: true,
                createdBy: true,
                createdAt: true,
                updatedAt: true,
                UpdatedBy: true,
                UpdatedDate: true,
                transporter: {
                    select: {
                        name: true
                    }
                },
                _count: {
                    select: {
                        dispatchSOs: true
                    }
                }
            }
        });
        return dispatches.map((d)=>({
                ...d,
                soCount: d._count.dispatchSOs
            }));
    }
    async update(id, dto, userId) {
        const { transporterId, vehicleNumber } = dto;
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
        const existingDispatch = await this.prisma.dispatch.findUnique({
            where: {
                id
            }
        });
        if (!existingDispatch) {
            throw new _common.NotFoundException(`Dispatch with ID ${id} not found.`);
        }
        return this.prisma.dispatch.update({
            where: {
                id
            },
            data: {
                transporterId: transporterId ? Number(transporterId) : undefined,
                vehicleNumber,
                UpdatedBy: user?.name || 'System',
                UpdatedDate: new Date()
            }
        });
    }
    async updateMobileDispatch(dispatchId, dto, userId) {
        const { transporterId, transporterName, vehicleNumber } = dto;
        return this.prisma.$transaction(async (tx)=>{
            const dispatch = await tx.dispatch.findUnique({
                where: {
                    id: dispatchId
                }
            });
            if (!dispatch) {
                throw new _common.NotFoundException(`Dispatch with ID ${dispatchId} not found.`);
            }
            let finalTransporterId = null;
            let finalTransporterName = null;
            if (transporterId) {
                finalTransporterId = Number(transporterId);
                const transporterExists = await tx.transporter.findUnique({
                    where: {
                        id: finalTransporterId
                    }
                });
                if (!transporterExists) {
                    throw new _common.BadRequestException(`Transporter with ID ${transporterId} not found.`);
                }
            } else if (transporterName) {
                finalTransporterName = transporterName;
            } else {
                finalTransporterId = null;
                finalTransporterName = null;
            }
            const userName = await this.getUserName(userId);
            const updatedDispatch = await tx.dispatch.update({
                where: {
                    id: dispatchId
                },
                data: {
                    transporterId: finalTransporterId,
                    transporterName: finalTransporterName,
                    vehicleNumber: vehicleNumber,
                    UpdatedBy: userName,
                    UpdatedDate: new Date()
                },
                include: {
                    transporter: true
                }
            });
            return updatedDispatch;
        });
    }
    async findDispatchSOs(dispatchId) {
        return this.prisma.dispatch_SO.findMany({
            where: {
                dispatchId
            },
            orderBy: {
                createdAt: 'asc'
            },
            include: {
                salesOrder: {
                    select: {
                        customer: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });
    }
    async addDispatchSO(dispatchId, saleOrderNumber, userId) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            }
        });
        if (!dispatch) {
            throw new _common.NotFoundException('Dispatch record not found.');
        }
        const salesOrder = await this.prisma.salesOrder.findFirst({
            where: {
                saleOrderNumber: {
                    equals: saleOrderNumber,
                    mode: 'insensitive'
                }
            },
            select: {
                saleOrderNumber: true
            }
        });
        if (!salesOrder) {
            throw new _common.NotFoundException('Invalid SO Number');
        }
        const userName = await this.getUserName(userId);
        return this.prisma.$transaction(async (tx)=>{
            try {
                const newDispatchSO = await tx.dispatch_SO.create({
                    data: {
                        dispatchId,
                        saleOrderNumber: salesOrder.saleOrderNumber
                    }
                });
                await tx.dispatch.update({
                    where: {
                        id: dispatchId
                    },
                    data: {
                        UpdatedDate: new Date()
                    }
                });
                await tx.salesOrder.update({
                    where: {
                        saleOrderNumber: salesOrder.saleOrderNumber
                    },
                    data: {
                        assignedUserId: null,
                        status: 'Dispatched',
                        fgLocation: null,
                        UpdatedBy: userName,
                        UpdatedDate: new Date()
                    }
                });
                await tx.sO_Status_Stepper.updateMany({
                    where: {
                        salesOrderNumber: salesOrder.saleOrderNumber,
                        status: "Dispatched"
                    },
                    data: {
                        createdDateTime: new Date(),
                        updatedBy: userName
                    }
                });
                return newDispatchSO;
            } catch (error) {
                if (error instanceof _client.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    throw new _common.BadRequestException('SO Number already added.');
                }
                throw error;
            }
        });
    }
    async removeDispatchSO(soId, userId) {
        const dispatchSoLink = await this.prisma.dispatch_SO.findUnique({
            where: {
                id: soId
            }
        });
        if (!dispatchSoLink) {
            throw new _common.NotFoundException('Dispatch link not found.');
        }
        const userName = await this.getUserName(userId);
        await this.prisma.$transaction(async (tx)=>{
            await tx.dispatch_SO.delete({
                where: {
                    id: soId
                }
            });
            await tx.salesOrder.update({
                where: {
                    saleOrderNumber: dispatchSoLink.saleOrderNumber
                },
                data: {
                    status: 'F105',
                    UpdatedBy: userName,
                    UpdatedDate: new Date()
                }
            });
            await tx.dispatch.update({
                where: {
                    id: dispatchSoLink.dispatchId
                },
                data: {
                    UpdatedDate: new Date()
                }
            });
        });
        return {
            message: 'SO Number removed and status reverted to F105'
        };
    }
    async generatePdf(dispatchId) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            },
            include: {
                dispatchSOs: {
                    select: {
                        saleOrderNumber: true
                    }
                }
            }
        });
        if (!dispatch) {
            throw new _common.NotFoundException('Dispatch not found');
        }
        const doc = new _pdfkit.default({
            margin: 50
        });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.fontSize(20).text('Dispatch Note', {
            align: 'center'
        });
        doc.moveDown();
        const tableTop = doc.y;
        const itemHeight = 25;
        const col1X = 50;
        const col2X = 150;
        const col1Width = 100;
        const col2Width = 200;
        doc.rect(col1X, tableTop, col1Width + col2Width, itemHeight).fillAndStroke('#FFD200', '#000000');
        doc.fillColor('#000000').font('Helvetica-Bold');
        doc.text('S.No', col1X + 10, tableTop + 8);
        doc.text('Sale Order Number', col2X + 10, tableTop + 8);
        doc.font('Helvetica');
        dispatch.dispatchSOs.forEach((so, index)=>{
            const y = tableTop + itemHeight + index * itemHeight;
            const bgColor = index % 2 === 0 ? '#FFF4CC' : '#FFFFFF';
            doc.rect(col1X, y, col1Width + col2Width, itemHeight).fillAndStroke(bgColor, '#000000');
            doc.fillColor('#000000');
            doc.text(String(index + 1), col1X + 10, y + 8);
            doc.text(so.saleOrderNumber, col2X + 10, y + 8);
        });
        return new Promise((resolve)=>{
            doc.on('end', ()=>resolve(Buffer.concat(buffers)));
            doc.end();
        });
    }
    async addAttachments(dispatchId, files) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            }
        });
        if (!dispatch) {
            throw new _common.NotFoundException('Dispatch not found');
        }
        const existingAttachments = dispatch.attachments || [];
        const newAttachments = [];
        const remoteDir = _path.posix.join(process.env.SFTP_BASE_DIR_DISPATCH || '', String(dispatchId));
        await this.sftpService.ensureDir(remoteDir);
        for (const file of files){
            const remotePath = _path.posix.join(remoteDir, file.originalname);
            await this.sftpService.put(file.buffer, remotePath);
            newAttachments.push({
                fileName: file.originalname,
                path: remotePath,
                mimeType: file.mimetype,
                size: file.size
            });
        }
        const allAttachments = [
            ...existingAttachments,
            ...newAttachments
        ];
        return this.prisma.dispatch.update({
            where: {
                id: dispatchId
            },
            data: {
                attachments: allAttachments
            }
        });
    }
    async deleteAttachment(dispatchId, fileName) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            }
        });
        if (!dispatch) {
            throw new _common.NotFoundException('Dispatch not found');
        }
        const attachments = dispatch.attachments || [];
        const attachmentToDelete = attachments.find((att)=>att.fileName === fileName);
        if (!attachmentToDelete) {
            throw new _common.NotFoundException('Attachment not found');
        }
        try {
            await this.sftpService.delete(attachmentToDelete.path);
        } catch (error) {
            console.error(`SFTP delete failed for ${attachmentToDelete.path}, but proceeding with DB update.`);
        }
        const updatedAttachments = attachments.filter((att)=>att.fileName !== fileName);
        return this.prisma.dispatch.update({
            where: {
                id: dispatchId
            },
            data: {
                attachments: updatedAttachments
            }
        });
    }
    async getAttachmentStream(dispatchId, fileName) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            }
        });
        if (!dispatch) {
            throw new _common.NotFoundException('Dispatch not found');
        }
        const attachments = dispatch.attachments || [];
        const attachment = attachments.find((att)=>att.fileName === fileName);
        if (!attachment) {
            throw new _common.NotFoundException('Attachment not found');
        }
        try {
            const streamOrBuffer = await this.sftpService.getStream(attachment.path);
            let stream;
            if (Buffer.isBuffer(streamOrBuffer)) {
                const { Readable } = require('stream');
                stream = Readable.from(streamOrBuffer);
            } else {
                stream = streamOrBuffer;
            }
            return {
                stream,
                mimeType: attachment.mimeType
            };
        } catch (error) {
            console.error('SFTP stream error:', error);
            throw new _common.NotFoundException('File not found on storage server.');
        }
    }
    constructor(prisma, sftpService){
        this.prisma = prisma;
        this.sftpService = sftpService;
        this.logger = new _common.Logger(DispatchService.name);
    }
};
DispatchService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _sftpservice.SftpService === "undefined" ? Object : _sftpservice.SftpService
    ])
], DispatchService);

//# sourceMappingURL=dispatch.service.js.map