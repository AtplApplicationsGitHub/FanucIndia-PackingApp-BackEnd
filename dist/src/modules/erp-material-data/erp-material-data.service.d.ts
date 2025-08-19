import { PrismaService } from '../../prisma.service';
export declare class ErpMaterialDataService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMaterialsByOrderId(orderId: number, userId: number, userRole: string): Promise<any>;
    incrementIssueStage(orderId: number, materialCode: string, userId: number, userRole: string): Promise<any>;
    updateIssueStage(orderId: number, materialCode: string, newIssueStage: number, userId: number, userRole: string): Promise<any>;
    incrementPackingStage(orderId: number, materialCode: string, userId: number, userRole: string): Promise<any>;
    updatePackingStage(orderId: number, materialCode: string, newPackingStage: number, userId: number, userRole: string): Promise<any>;
}
