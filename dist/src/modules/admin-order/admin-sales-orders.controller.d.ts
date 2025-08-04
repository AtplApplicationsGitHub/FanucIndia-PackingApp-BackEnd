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
        createdAt: Date;
        updatedAt: Date;
        productId: number;
        transporterId: number;
        plantCodeId: number;
        salesZoneId: number;
        packConfigId: number;
        customerId: number | null;
        userId: number;
        terminalId: number | null;
        printerId: number | null;
        status: string;
        priority: number | null;
    }>;
}
