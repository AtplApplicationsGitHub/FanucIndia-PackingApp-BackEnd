import { PrismaService } from '../../prisma.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
export declare class SalesCrudService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateSalesCrudDto, userId: number): Promise<{
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
    findAll(userId: number, query: {
        search?: string;
    }): Promise<({
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
    })[]>;
    findOne(id: number, userId: number): Promise<{
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
    update(id: number, dto: UpdateSalesCrudDto, userId: number): Promise<{
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
    remove(id: number, userId: number): Promise<void>;
    getPaginatedOrders(page: number, limit: number, userId: number, search?: string): Promise<{
        orders: ({
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
        })[];
        totalCount: number;
    }>;
}
