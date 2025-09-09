import { PrismaService } from '../../prisma.service';
export declare class ErpMaterialImporterService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    processFile(file: Express.Multer.File, expectedSaleOrderNumber?: string): Promise<{
        message: string;
    }>;
    private readFile;
    private validateRecords;
    private renameColumns;
    private upsertRecords;
}
