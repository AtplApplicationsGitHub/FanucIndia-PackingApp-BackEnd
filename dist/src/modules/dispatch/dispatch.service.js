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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const sftp_service_1 = require("../sftp/sftp.service");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const client_1 = require("@prisma/client");
const pdfkit_1 = __importDefault(require("pdfkit"));
let DispatchService = class DispatchService {
    prisma;
    sftpService;
    constructor(prisma, sftpService) {
        this.prisma = prisma;
        this.sftpService = sftpService;
    }
    async create(dto, files, userId) {
        const { customerId, address, transporterId, vehicleNumber } = dto;
        return this.prisma.$transaction(async (tx) => {
            const uploadedAttachments = [];
            if (files && files.length > 0) {
                const remoteDir = path.posix.join(process.env.SFTP_BASE_DIR || '/fanuc/dispatch-attachments', `${Date.now()}`);
                await this.sftpService.ensureDir(remoteDir);
                for (const file of files) {
                    const remotePath = path.posix.join(remoteDir, file.filename);
                    await this.sftpService.put(file.path, remotePath);
                    uploadedAttachments.push({
                        fileName: file.originalname,
                        path: remotePath,
                        mimeType: file.mimetype,
                        size: file.size,
                    });
                    fs.unlinkSync(file.path);
                }
            }
            const newDispatch = await tx.dispatch.create({
                data: {
                    customerId: Number(customerId),
                    address,
                    transporterId: transporterId ? Number(transporterId) : null,
                    vehicleNumber,
                    createdBy: userId,
                    attachments: uploadedAttachments.length > 0
                        ? uploadedAttachments
                        : client_1.Prisma.JsonNull,
                },
            });
            await tx.salesOrder.updateMany({
                where: {
                    customerId: Number(customerId),
                    status: 'F105',
                },
                data: {
                    status: 'Dispatched',
                },
            });
            return newDispatch;
        });
    }
    async findAll() {
        const dispatches = await this.prisma.dispatch.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { name: true } },
                transporter: { select: { name: true } },
                _count: {
                    select: { dispatchSOs: true },
                },
            },
        });
        return dispatches.map((d) => ({
            ...d,
            soCount: d._count.dispatchSOs,
        }));
    }
    async update(id, dto) {
        const { customerId, transporterId, vehicleNumber } = dto;
        return this.prisma.dispatch.update({
            where: { id },
            data: {
                customerId: customerId ? Number(customerId) : undefined,
                transporterId: transporterId ? Number(transporterId) : undefined,
                vehicleNumber,
            },
        });
    }
    async findDispatchSOs(dispatchId) {
        return this.prisma.dispatch_SO.findMany({
            where: { dispatchId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async addDispatchSO(dispatchId, saleOrderNumber) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: { id: dispatchId },
            select: { customerId: true },
        });
        if (!dispatch) {
            throw new common_1.NotFoundException('Dispatch record not found.');
        }
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: { saleOrderNumber },
            select: { customerId: true },
        });
        if (!salesOrder) {
            throw new common_1.NotFoundException('Invalid SO Number');
        }
        if (salesOrder.customerId !== dispatch.customerId) {
            throw new common_1.BadRequestException('This SO Number belongs to a different customer.');
        }
        try {
            return await this.prisma.dispatch_SO.create({
                data: {
                    dispatchId,
                    saleOrderNumber,
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new common_1.BadRequestException('SO Number already added.');
            }
            throw error;
        }
    }
    async removeDispatchSO(soId) {
        await this.prisma.dispatch_SO.delete({ where: { id: soId } });
        return { message: 'SO Number removed' };
    }
    async generatePdf(dispatchId) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: { id: dispatchId },
            include: {
                customer: true,
                dispatchSOs: {
                    select: {
                        saleOrderNumber: true,
                    },
                },
            },
        });
        if (!dispatch) {
            throw new common_1.NotFoundException('Dispatch not found');
        }
        const doc = new pdfkit_1.default({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.fontSize(20).text('Dispatch Note', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Customer Name: ${dispatch.customer.name}`);
        doc.text(`Address: ${dispatch.customer.address}`);
        doc.moveDown();
        const tableTop = doc.y;
        const tableHeaders = ['S.No', 'Sale Order Number'];
        doc.font('Helvetica-Bold');
        tableHeaders.forEach((header, i) => {
            doc.text(header, 50 + i * 250, tableTop);
        });
        doc.font('Helvetica');
        dispatch.dispatchSOs.forEach((so, index) => {
            const y = tableTop + 25 + index * 25;
            doc.text(String(index + 1), 50, y);
            doc.text(so.saleOrderNumber, 300, y);
        });
        return new Promise((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.end();
        });
    }
    async addAttachments(dispatchId, files) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: { id: dispatchId },
        });
        if (!dispatch) {
            throw new common_1.NotFoundException('Dispatch not found');
        }
        const existingAttachments = dispatch.attachments || [];
        const newAttachments = [];
        const remoteDir = path.posix.join(process.env.SFTP_BASE_DIR || '/fanuc/dispatch-attachments', `${dispatch.id}_${Date.now()}`);
        await this.sftpService.ensureDir(remoteDir);
        for (const file of files) {
            const remotePath = path.posix.join(remoteDir, file.filename);
            await this.sftpService.put(file.path, remotePath);
            newAttachments.push({
                fileName: file.originalname,
                path: remotePath,
                mimeType: file.mimetype,
                size: file.size,
            });
            fs.unlinkSync(file.path);
        }
        const allAttachments = [...existingAttachments, ...newAttachments];
        return this.prisma.dispatch.update({
            where: { id: dispatchId },
            data: { attachments: allAttachments },
        });
    }
    async deleteAttachment(dispatchId, fileName) {
        const dispatch = await this.prisma.dispatch.findUnique({
            where: { id: dispatchId },
        });
        if (!dispatch) {
            throw new common_1.NotFoundException('Dispatch not found');
        }
        const attachments = dispatch.attachments || [];
        const attachmentToDelete = attachments.find((att) => att.fileName === fileName);
        if (!attachmentToDelete) {
            throw new common_1.NotFoundException('Attachment not found');
        }
        try {
            await this.sftpService.delete(attachmentToDelete.path);
        }
        catch (error) {
            console.error(`SFTP delete failed for ${attachmentToDelete.path}, but proceeding with DB update.`);
        }
        const updatedAttachments = attachments.filter((att) => att.fileName !== fileName);
        return this.prisma.dispatch.update({
            where: { id: dispatchId },
            data: { attachments: updatedAttachments },
        });
    }
    async getAttachmentStream(dispatchId, fileName) {
        const dispatch = await this.prisma.dispatch.findUnique({ where: { id: dispatchId } });
        if (!dispatch) {
            throw new common_1.NotFoundException('Dispatch not found');
        }
        const attachments = dispatch.attachments || [];
        const attachment = attachments.find(att => att.fileName === fileName);
        if (!attachment) {
            throw new common_1.NotFoundException('Attachment not found');
        }
        try {
            const streamOrBuffer = await this.sftpService.getStream(attachment.path);
            let stream;
            if (Buffer.isBuffer(streamOrBuffer)) {
                const { Readable } = require('stream');
                stream = Readable.from(streamOrBuffer);
            }
            else {
                stream = streamOrBuffer;
            }
            return { stream, mimeType: attachment.mimeType };
        }
        catch (error) {
            console.error("SFTP stream error:", error);
            throw new common_1.NotFoundException('File not found on storage server.');
        }
    }
};
exports.DispatchService = DispatchService;
exports.DispatchService = DispatchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sftp_service_1.SftpService])
], DispatchService);
//# sourceMappingURL=dispatch.service.js.map