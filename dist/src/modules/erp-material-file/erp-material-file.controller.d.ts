import { ErpMaterialFileService } from './erp-material-file.service';
import { CreateErpMaterialFileDto } from './dto/create-erp-material-file.dto';
import { UpdateErpMaterialFileDto } from './dto/update-erp-material-file.dto';
import { QueryErpMaterialFileDto } from './dto/query-erp-material-file.dto';
import { Response } from 'express';
import { SftpService } from '../sftp/sftp.service';
import { AuthRequest } from '../auth/types/auth-request.type';
export declare class ErpMaterialFileController {
    private readonly service;
    private readonly sftp;
    constructor(service: ErpMaterialFileService, sftp: SftpService);
    list(query: QueryErpMaterialFileDto, req: AuthRequest): Promise<any>;
    listBySaleOrder(saleOrderNumber: string, req: AuthRequest): Promise<any>;
    get(id: number, req: AuthRequest): Promise<any>;
    create(dto: CreateErpMaterialFileDto): Promise<void>;
    update(id: number, dto: UpdateErpMaterialFileDto, req: AuthRequest): Promise<any>;
    remove(id: number, req: AuthRequest): Promise<{
        success: boolean;
    }>;
    download(id: number, res: Response, req: AuthRequest): Promise<Response<any, Record<string, any>> | undefined>;
    upload(files: Express.Multer.File[], saleOrderNumber?: string, description?: string, req?: AuthRequest): Promise<{
        success: boolean;
        items: any[];
    }>;
}
