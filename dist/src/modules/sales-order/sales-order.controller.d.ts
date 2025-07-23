import { Response } from 'express';
import { SalesOrderService } from './sales-order.service';
import { AuthRequest } from '../auth/types/auth-request.type';
export declare class SalesOrderController {
    private readonly salesOrderService;
    constructor(salesOrderService: SalesOrderService);
    downloadTemplate(res: Response): Promise<void>;
    bulkImport(file: Express.Multer.File, req: AuthRequest): Promise<{
        message: string;
        errors: any[];
        insertedCount: number;
        preview: any[];
    }>;
}
