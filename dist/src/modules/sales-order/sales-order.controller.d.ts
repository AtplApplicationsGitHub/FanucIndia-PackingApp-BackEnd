import { Response } from 'express';
import { SalesOrderService } from './sales-order.service';
export declare class SalesOrderController {
    private readonly salesOrderService;
    constructor(salesOrderService: SalesOrderService);
    downloadTemplate(res: Response): Promise<void>;
    bulkImport(file: any, req: any): Promise<{
        message: string;
        errors: any[];
        insertedCount: number;
        preview: any[];
    }>;
}
