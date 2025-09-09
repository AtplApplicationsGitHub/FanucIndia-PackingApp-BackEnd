import { PrismaService } from '../../prisma.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { SftpService } from '../sftp/sftp.service';
import { Prisma } from '@prisma/client';
export declare class DispatchService {
    private readonly prisma;
    private readonly sftpService;
    constructor(prisma: PrismaService, sftpService: SftpService);
    create(dto: CreateDispatchDto, files: Express.Multer.File[], userId: number): Promise<{
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        soCount: number;
        transporter: {
            name: string;
        } | null;
        customer: {
            name: string;
        };
        _count: {
            dispatchSOs: number;
        };
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    update(id: number, dto: UpdateDispatchDto): Promise<{
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findDispatchSOs(dispatchId: number): Promise<{
        id: number;
        createdAt: Date;
        dispatchId: number;
        saleOrderNumber: string;
    }[]>;
    addDispatchSO(dispatchId: number, saleOrderNumber: string): Promise<{
        id: number;
        createdAt: Date;
        dispatchId: number;
        saleOrderNumber: string;
    }>;
    removeDispatchSO(soId: number): Promise<{
        message: string;
    }>;
    generatePdf(dispatchId: number): Promise<Buffer>;
    addAttachments(dispatchId: number, files: Express.Multer.File[]): Promise<{
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteAttachment(dispatchId: number, fileName: string): Promise<{
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAttachmentStream(dispatchId: number, fileName: string): Promise<{
        stream: any;
        mimeType: string;
    }>;
}
