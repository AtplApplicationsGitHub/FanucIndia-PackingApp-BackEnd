import { PrismaService } from '../../prisma.service';
export declare class FgDashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getFgDashboardData(user: {
        userId: number;
        role: string;
    }): Promise<{
        id: number;
        deliveryDate: Date;
        saleOrderNumber: string;
        product: string;
        customerName: string | undefined;
        payment: boolean;
        status: string;
        fgLocation: string | null;
        specialRemarks: string | null;
        updatedBy: string | null | undefined;
        updatedDate: Date | null | undefined;
    }[]>;
}
