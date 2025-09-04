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
        assignedUserId: number | null;
        customerId: number | null;
        printerId: number | null;
        specialRemarks: string | null;
        fgLocation: string | null;
        status: string;
        priority: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(userId: number, query: {
        search?: string;
    }): Promise<({
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
        assignedUserId: number | null;
        customerId: number | null;
        printerId: number | null;
        specialRemarks: string | null;
        fgLocation: string | null;
        status: string;
        priority: number | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOne(id: number, userId: number): Promise<{
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
        assignedUserId: number | null;
        customerId: number | null;
        printerId: number | null;
        specialRemarks: string | null;
        fgLocation: string | null;
        status: string;
        priority: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: number, dto: UpdateSalesCrudDto, userId: number): Promise<{
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
        assignedUserId: number | null;
        customerId: number | null;
        printerId: number | null;
        specialRemarks: string | null;
        fgLocation: string | null;
        status: string;
        priority: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number, userId: number): Promise<void>;
    getPaginatedOrders(page: number, limit: number, userId: number, search?: string): Promise<{
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
            assignedUserId: number | null;
            customerId: number | null;
            printerId: number | null;
            specialRemarks: string | null;
            fgLocation: string | null;
            status: string;
            priority: number | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        totalCount: number;
    }>;
}
