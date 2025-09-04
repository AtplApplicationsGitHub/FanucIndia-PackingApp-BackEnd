import { PrismaService } from '../../prisma.service';
export declare class AdminSalesOrdersController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSalesOrderById(id: number): Promise<{
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
        productId: number;
        transporterId: number;
        plantCodeId: number;
        salesZoneId: number;
        packConfigId: number;
        assignedUserId: number | null;
        customerId: number | null;
        printerId: number | null;
        fgLocation: string | null;
        status: string;
        priority: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
