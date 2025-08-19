import { AuthRequest } from '../auth/types/auth-request.type';
import { UserDashboardService } from './user-dashboard.service';
export declare class UserDashboardController {
    private readonly userDashboardService;
    constructor(userDashboardService: UserDashboardService);
    getAssignedOrders(req: AuthRequest): Promise<{
        product: {
            name: string;
        };
        packConfig: {
            configName: string;
        };
        saleOrderNumber: string;
        outboundDelivery: string;
        transferOrder: string;
        deliveryDate: Date;
        paymentClearance: boolean;
        specialRemarks: string | null;
        id: number;
        userId: number;
        createdAt: Date;
        updatedAt: Date;
        productId: number;
        transporterId: number;
        plantCodeId: number;
        salesZoneId: number;
        packConfigId: number;
        customerId: number | null;
        assignedUserId: number | null;
        printerId: number | null;
        fgLocation: string | null;
        status: string;
        priority: number | null;
    }[]>;
    getOrderDetails(id: number, req: AuthRequest): Promise<{
        customer: {
            id: number;
            name: string;
            address: string;
        } | null;
    } & {
        saleOrderNumber: string;
        outboundDelivery: string;
        transferOrder: string;
        deliveryDate: Date;
        paymentClearance: boolean;
        specialRemarks: string | null;
        id: number;
        userId: number;
        createdAt: Date;
        updatedAt: Date;
        productId: number;
        transporterId: number;
        plantCodeId: number;
        salesZoneId: number;
        packConfigId: number;
        customerId: number | null;
        assignedUserId: number | null;
        printerId: number | null;
        fgLocation: string | null;
        status: string;
        priority: number | null;
    }>;
}
