import { FgDashboardService } from './fg-dashboard.service';
import { AuthRequest } from '../auth/types/auth-request.type';
export declare class FgDashboardController {
    private readonly fgDashboardService;
    constructor(fgDashboardService: FgDashboardService);
    getFgDashboardData(req: AuthRequest): Promise<{
        id: number;
        deliveryDate: Date;
        saleOrderNumber: string;
        product: string;
        customerName: string | undefined;
        payment: boolean;
        status: string;
        fgLocation: string | null;
        specialRemarks: string | null;
        updatedBy: string | null | undefined;
        updatedDate: Date | null | undefined;
    }[]>;
}
