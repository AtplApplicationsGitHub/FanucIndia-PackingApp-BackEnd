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
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
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
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
    }[]>;
    update(id: number, dto: UpdateDispatchDto): Promise<{
        id: number;
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
    }>;
    findDispatchSOs(dispatchId: number): Promise<{
        saleOrderNumber: string;
        id: number;
        createdAt: Date;
        dispatchId: number;
    }[]>;
    addDispatchSO(dispatchId: number, saleOrderNumber: string): Promise<{
        saleOrderNumber: string;
        id: number;
        createdAt: Date;
        dispatchId: number;
    }>;
    removeDispatchSO(soId: number): Promise<{
        message: string;
    }>;
    generatePdf(dispatchId: number): Promise<Buffer>;
    addAttachments(dispatchId: number, files: Express.Multer.File[]): Promise<{
        id: number;
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
    }>;
    deleteAttachment(dispatchId: number, fileName: string): Promise<{
        id: number;
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: Prisma.JsonValue | null;
        createdBy: number;
    }>;
    getAttachmentStream(dispatchId: number, fileName: string): Promise<{
        stream: any;
        mimeType: string;
    }>;
}
