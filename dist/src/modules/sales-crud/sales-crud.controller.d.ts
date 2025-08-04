import { SalesCrudService } from './sales-crud.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
export declare class SalesCrudController {
    private readonly service;
    constructor(service: SalesCrudService);
    create(dto: CreateSalesCrudDto, req: any): Promise<{
        customer: {
            id: number;
            name: string;
            address: string;
        } | null;
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
    }>;
    findAll(req: any, page?: string, limit?: string, search?: string): Promise<{
        orders: ({
            customer: {
                id: number;
                name: string;
                address: string;
            } | null;
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
            transporter: {
                id: number;
                name: string;
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
        totalCount: number;
    }>;
    findOne(id: number, req: any): Promise<{
        customer: {
            id: number;
            name: string;
            address: string;
        } | null;
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
        transporter: {
            id: number;
            name: string;
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
    }>;
    update(id: number, dto: UpdateSalesCrudDto, req: any): Promise<{
        customer: {
            id: number;
            name: string;
            address: string;
        } | null;
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
        transporter: {
            id: number;
            name: string;
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
    }>;
    remove(id: number, req: any): Promise<{
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
}
