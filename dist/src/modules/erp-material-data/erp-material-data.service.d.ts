import { PrismaService } from '../../prisma.service';
export declare class ErpMaterialDataService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMaterialsByOrderId(orderId: number): Promise<any>;
    incrementIssueStage(orderId: number, materialCode: string): Promise<any>;
    updateIssueStage(orderId: number, materialCode: string, newIssueStage: number): Promise<any>;
    incrementPackingStage(orderId: number, materialCode: string): Promise<any>;
    updatePackingStage(orderId: number, materialCode: string, newPackingStage: number): Promise<any>;
}
