import { Response } from 'express';
export declare class SalesOrderService {
    generateBulkTemplate(res: Response, lookups: {
        products: string[];
        transporters: string[];
        plantCodes: string[];
        salesZones: string[];
        packConfigs: string[];
    }): Promise<void>;
    importBulkOrders(fileBuffer: Buffer, userId: number): Promise<{
        message: string;
        errors: any[];
        insertedCount: number;
        preview: any[];
    }>;
}
