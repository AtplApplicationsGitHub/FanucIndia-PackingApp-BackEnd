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
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
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
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: number;
    }[]>;
    update(id: number, updateDispatchDto: UpdateDispatchDto): Promise<{
        id: number;
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: number;
    }>;
    findDispatchSOs(id: number): Promise<{
        saleOrderNumber: string;
        id: number;
        createdAt: Date;
        dispatchId: number;
    }[]>;
    addDispatchSO(id: number, saleOrderNumber: string): Promise<{
        saleOrderNumber: string;
        id: number;
        createdAt: Date;
        dispatchId: number;
    }>;
    removeDispatchSO(soId: number): Promise<{
        message: string;
    }>;
    generatePdf(id: number, res: Response): Promise<void>;
    addAttachments(id: number, files: Express.Multer.File[]): Promise<{
        id: number;
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: number;
    }>;
    deleteAttachment(id: number, fileName: string): Promise<{
        id: number;
        address: string;
        createdAt: Date;
        updatedAt: Date;
        transporterId: number | null;
        customerId: number;
        vehicleNumber: string;
        attachments: import("@prisma/client/runtime/library").JsonValue | null;
        createdBy: number;
    }>;
    downloadDispatchAttachment(id: number, fileName: string, res: Response): Promise<void>;
}
