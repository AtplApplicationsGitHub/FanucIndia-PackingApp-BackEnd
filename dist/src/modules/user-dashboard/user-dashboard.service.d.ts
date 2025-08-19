import { PrismaService } from '../../prisma.service';
export declare class UserDashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAssignedOrders(userId: number): Promise<{
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
    findOrderById(orderId: number, userId: number, userRole: string): Promise<({
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
    }) | null>;
}
