import { Response } from 'express';
export declare class SalesOrderService {
    generateBulkTemplate(res: Response): Promise<void>;
    importBulkOrders(fileBuffer: Buffer, userId: number): Promise<{
        message: string;
        errors: any[];
        insertedCount: number;
        preview: any[];
    }>;
}
