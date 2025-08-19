import { PrismaService } from '../../prisma.service';
import { SftpService } from '../sftp/sftp.service';
import { CreateErpMaterialFileDto } from './dto/create-erp-material-file.dto';
import { UpdateErpMaterialFileDto } from './dto/update-erp-material-file.dto';
import { QueryErpMaterialFileDto } from './dto/query-erp-material-file.dto';
export declare class ErpMaterialFileService {
    private readonly prisma;
    private readonly sftp;
    constructor(prisma: PrismaService, sftp: SftpService);
    list(query: QueryErpMaterialFileDto, userId: number, userRole: string): Promise<any>;
    get(id: number, userId: number, userRole: string): Promise<any>;
    listBySaleOrderNumber(soNumber: string, userId: number, userRole: string): Promise<any>;
    create(_dto: CreateErpMaterialFileDto): Promise<void>;
    update(id: number, dto: UpdateErpMaterialFileDto, userId: number, userRole: string): Promise<any>;
    remove(id: number, userId: number, userRole: string): Promise<{
        success: boolean;
    }>;
    uploadAndCreate(files: Express.Multer.File[], opts: {
        saleOrderNumber: string | null;
        description: string | null;
    }, userId: number, userRole: string): Promise<{
        success: boolean;
        items: any[];
    }>;
}
