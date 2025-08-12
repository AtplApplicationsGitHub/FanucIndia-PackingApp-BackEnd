import { ErpMaterialFileService } from './erp-material-file.service';
import { CreateErpMaterialFileDto } from './dto/create-erp-material-file.dto';
import { UpdateErpMaterialFileDto } from './dto/update-erp-material-file.dto';
import { QueryErpMaterialFileDto } from './dto/query-erp-material-file.dto';
import { Response } from 'express';
import { SftpService } from '../sftp/sftp.service';
export declare class ErpMaterialFileController {
    private readonly service;
    private readonly sftp;
    constructor(service: ErpMaterialFileService, sftp: SftpService);
    list(query: QueryErpMaterialFileDto): Promise<any>;
    listBySaleOrder(saleOrderNumber: string): Promise<any>;
    get(id: number): Promise<any>;
    create(dto: CreateErpMaterialFileDto): Promise<void>;
    update(id: number, dto: UpdateErpMaterialFileDto): Promise<any>;
    remove(id: number): Promise<{
        success: boolean;
    }>;
    download(id: number, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    upload(files: Express.Multer.File[], saleOrderNumber?: string, description?: string): Promise<{
        success: boolean;
        items: any[];
    }>;
}
