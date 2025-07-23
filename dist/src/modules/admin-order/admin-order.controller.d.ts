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
            terminal: {
                id: number;
                name: string;
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
    remove(id: number): Promise<{
        message: string;
    }>;
}
