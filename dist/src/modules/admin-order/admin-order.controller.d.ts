import { AdminOrderService } from './admin-order.service';
import { UpdateAdminOrderDto } from './dto/update-admin-order.dto';
export declare class AdminOrderController {
    private readonly service;
    constructor(service: AdminOrderService);
    findAll(query: any): Promise<{
        total: number;
        page: number;
        limit: number;
        data: ({
            packConfig: {
                id: number;
                configName: string;
            };
            plantCode: {
                id: number;
                code: string;
                description: string | null;
            };
            product: {
                id: number;
                name: string;
                code: string | null;
            };
            salesZone: {
                id: number;
                name: string;
            };
            terminal: {
                id: number;
                name: string;
            } | null;
            transporter: {
                id: number;
                name: string;
            };
            user: {
                id: number;
                name: string;
                email: string;
            };
        } & {
            id: number;
            userId: number;
            productId: number;
            saleOrderNumber: string;
            outboundDelivery: string;
            transferOrder: string;
            deliveryDate: Date;
            transporterId: number;
            plantCodeId: number;
            paymentClearance: boolean;
            salesZoneId: number;
            packConfigId: number;
            terminalId: number | null;
            customerId: number | null;
            printerId: number | null;
            specialRemarks: string | null;
            status: string;
            priority: number | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
    }>;
    update(id: number, dto: UpdateAdminOrderDto): Promise<{
        id: number;
        userId: number;
        productId: number;
        saleOrderNumber: string;
        outboundDelivery: string;
        transferOrder: string;
        deliveryDate: Date;
        transporterId: number;
        plantCodeId: number;
        paymentClearance: boolean;
        salesZoneId: number;
        packConfigId: number;
        terminalId: number | null;
        customerId: number | null;
        printerId: number | null;
        specialRemarks: string | null;
        status: string;
        priority: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
