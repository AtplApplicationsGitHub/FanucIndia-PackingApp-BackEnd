import { Response } from 'express';
import { PrismaService } from '../../prisma.service';
export declare class SalesOrderService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    generateBulkTemplate(res: Response): Promise<void>;
    importBulkOrders(fileBuffer: Buffer, userId: number): Promise<{
        message: string;
        errors: any[];
        insertedCount: number;
        preview: any[];
    }>;
}
