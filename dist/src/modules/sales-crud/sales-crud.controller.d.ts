import { SalesCrudService } from './sales-crud.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
export declare class SalesCrudController {
    private readonly service;
    constructor(service: SalesCrudService);
    create(dto: CreateSalesCrudDto, req: any): Promise<{
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
    findAll(req: any): Promise<({
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
    })[]>;
    findOne(id: number, req: any): Promise<{
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
    update(id: number, dto: UpdateSalesCrudDto, req: any): Promise<{
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
    remove(id: number, req: any): Promise<{
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
