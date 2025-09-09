import { AuthRequest } from '../auth/types/auth-request.type';
import { DispatchService } from './dispatch.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { Response } from 'express';
export declare class DispatchController {
    private readonly dispatchService;
    constructor(dispatchService: DispatchService);
    create(createDispatchDto: CreateDispatchDto, files: Express.Multer.File[], req: AuthRequest): Promise<{
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
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
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    update(id: number, updateDispatchDto: UpdateDispatchDto): Promise<{
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findDispatchSOs(id: number): Promise<{
        id: number;
        createdAt: Date;
        dispatchId: number;
        saleOrderNumber: string;
    }[]>;
    addDispatchSO(id: number, saleOrderNumber: string): Promise<{
        id: number;
        createdAt: Date;
        dispatchId: number;
        saleOrderNumber: string;
    }>;
    removeDispatchSO(soId: number): Promise<{
        message: string;
    }>;
    generatePdf(id: number, res: Response): Promise<void>;
    addAttachments(id: number, files: Express.Multer.File[]): Promise<{
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteAttachment(id: number, fileName: string): Promise<{
        id: number;
        customerId: number;
        address: string;
        transporterId: number | null;
        vehicleNumber: string;
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    downloadDispatchAttachment(id: number, fileName: string, res: Response): Promise<void>;
}
