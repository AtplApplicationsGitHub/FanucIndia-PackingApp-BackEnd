import { PrismaService } from '../../prisma.service';
import { UpdateAdminOrderDto } from './dto/update-admin-order.dto';
export declare class AdminOrderService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: any): Promise<{
        total: number;
        page: number;
        limit: number;
        data: {
            hasMaterialData: boolean;
            user: {
                id: number;
                name: string;
                email: string;
            };
            product: {
                id: number;
                name: string;
                code: string | null;
            };
            transporter: {
                id: number;
                name: string;
            };
            plantCode: {
                id: number;
                code: string;
                description: string | null;
            };
            salesZone: {
                id: number;
                name: string;
            };
            packConfig: {
                id: number;
                configName: string;
            };
            assignedUser: {
                id: number;
                name: string;
            } | null;
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
        }[];
    }>;
    update(id: number, dto: UpdateAdminOrderDto, user: {
        userId: number;
        role: string;
    }): Promise<{
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
    remove(id: number): Promise<{
        message: string;
    }>;
}
