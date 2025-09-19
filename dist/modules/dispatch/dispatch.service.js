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
    async create(dto, files, userId) {
        const { customerId, address, transporterId, vehicleNumber, saleOrderNumbers } = dto;
        return this.prisma.$transaction(async (tx)=>{
            const uploadedAttachments = [];
            if (files && files.length > 0) {
                const remoteDir = _path.posix.join(process.env.SFTP_BASE_DIR || '/fanuc/dispatch-attachments', `${Date.now()}`);
                await this.sftpService.ensureDir(remoteDir);
                for (const file of files){
                    const remotePath = _path.posix.join(remoteDir, file.filename);
                    await this.sftpService.put(file.path, remotePath);
                    uploadedAttachments.push({
                        fileName: file.originalname,
                        path: remotePath,
                        mimeType: file.mimetype,
                        size: file.size
                    });
                    _fs.unlinkSync(file.path);
                }
            }
            const newDispatch = await tx.dispatch.create({
                data: {
                    customerId: Number(customerId),
                    address,
                    transporterId: transporterId ? Number(transporterId) : null,
                    vehicleNumber,
                    createdBy: userId,
                    attachments: uploadedAttachments.length > 0 ? uploadedAttachments : _client.Prisma.JsonNull
                }
            });
            if (saleOrderNumbers && saleOrderNumbers.length > 0) {
                // Validate SOs
                for (const so of saleOrderNumbers){
                    const salesOrder = await tx.salesOrder.findUnique({
                        where: {
                            saleOrderNumber: so
                        }
                    });
                    if (!salesOrder) throw new _common.BadRequestException(`Sale Order ${so} not found.`);
                    if (salesOrder.customerId !== Number(customerId)) throw new _common.BadRequestException(`Sale Order ${so} belongs to a different customer.`);
                }
                // Link SOs to the new dispatch
                await tx.dispatch_SO.createMany({
                    data: saleOrderNumbers.map((so)=>({
                            dispatchId: newDispatch.id,
                            saleOrderNumber: so
                        }))
                });
                // Update status of only the specified SOs
                await tx.salesOrder.updateMany({
                    where: {
                        saleOrderNumber: {
                            in: saleOrderNumbers
                        }
                    },
                    data: {
                        status: 'Dispatched'
                    }
                });
            }
            return newDispatch;
        });
    }
    async findAll() {
        const dispatches = await this.prisma.dispatch.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                customer: {
                    select: {
                        name: true
                    }
                },
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
    async update(id, dto) {
        const { customerId, transporterId, vehicleNumber } = dto;
        return this.prisma.dispatch.update({
            where: {
                id
            },
            data: {
                customerId: customerId ? Number(customerId) : undefined,
                transporterId: transporterId ? Number(transporterId) : undefined,
                vehicleNumber
            }
        });
    }
    async findDispatchSOs(dispatchId) {
        return this.prisma.dispatch_SO.findMany({
            where: {
                dispatchId
            },
            orderBy: {
                createdAt: 'asc'
            }
        });
    }
    async addDispatchSO(dispatchId, saleOrderNumber) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            },
            select: {
                customerId: true
            }
        });
        if (!dispatch) {
            throw new _common.NotFoundException('Dispatch record not found.');
        }
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: {
                saleOrderNumber
            },
            select: {
                customerId: true
            }
        });
        if (!salesOrder) {
            throw new _common.NotFoundException('Invalid SO Number');
        }
        // if (salesOrder.customerId !== dispatch.customerId) {
        //   throw new BadRequestException(
        //     'This SO Number belongs to a different customer.',
        //   );
        // }
        // Status update logic is now in the create method, so this becomes simpler.
        try {
            return await this.prisma.dispatch_SO.create({
                data: {
                    dispatchId,
                    saleOrderNumber
                }
            });
        } catch (error) {
            if (error instanceof _client.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new _common.BadRequestException('SO Number already added.');
            }
            throw error;
        }
    }
    async removeDispatchSO(soId) {
        await this.prisma.dispatch_SO.delete({
            where: {
                id: soId
            }
        });
        return {
            message: 'SO Number removed'
        };
    }
    async generatePdf(dispatchId) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: {
                id: dispatchId
            },
            include: {
                customer: true,
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
        doc.fontSize(12).text(`Customer Name: ${dispatch.customer.name}`);
        doc.text(`Address: ${dispatch.customer.address}`);
        doc.moveDown();
        const tableTop = doc.y;
        const tableHeaders = [
            'S.No',
            'Sale Order Number'
        ];
        doc.font('Helvetica-Bold');
        tableHeaders.forEach((header, i)=>{
            doc.text(header, 50 + i * 250, tableTop);
        });
        doc.font('Helvetica');
        dispatch.dispatchSOs.forEach((so, index)=>{
            const y = tableTop + 25 + index * 25;
            doc.text(String(index + 1), 50, y);
            doc.text(so.saleOrderNumber, 300, y);
        });
        return new Promise((resolve)=>{
            doc.on('end', ()=>{
                resolve(Buffer.concat(buffers));
            });
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
        const remoteDir = _path.posix.join(process.env.SFTP_BASE_DIR || '/fanuc/dispatch-attachments', `${dispatch.id}_${Date.now()}`);
        await this.sftpService.ensureDir(remoteDir);
        for (const file of files){
            const remotePath = _path.posix.join(remoteDir, file.filename);
            await this.sftpService.put(file.path, remotePath);
            newAttachments.push({
                fileName: file.originalname,
                path: remotePath,
                mimeType: file.mimetype,
                size: file.size
            });
            _fs.unlinkSync(file.path);
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
            console.error("SFTP stream error:", error);
            throw new _common.NotFoundException('File not found on storage server.');
        }
    }
    constructor(prisma, sftpService){
        this.prisma = prisma;
        this.sftpService = sftpService;
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