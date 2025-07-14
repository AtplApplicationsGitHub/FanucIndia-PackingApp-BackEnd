import { PrismaService } from '../../prisma.service';
import { UpdateAdminOrderDto } from './dto/update-admin-order.dto';
export declare class AdminOrderService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: any): Promise<{
        total: number;
        page: number;
        limit: number;
        data: ({
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
            user: {
                id: number;
                email: string;
                password: string;
                role: string;
                createdAt: Date;
                updatedAt: Date;
            };
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
            status: string;
            priority: number | null;
        })[];
    }>;
    update(id: number, dto: UpdateAdminOrderDto): Promise<{
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
        status: string;
        priority: number | null;
    }>;
}
