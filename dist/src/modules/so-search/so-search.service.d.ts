import { PrismaService } from '../../prisma.service';
export declare class SoSearchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findDetailsBySoNumber(saleOrderNumber: string, user: {
        userId: number;
        role: string;
    }): Promise<any>;
}
