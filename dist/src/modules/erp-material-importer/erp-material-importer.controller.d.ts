import { ErpMaterialImporterService } from './erp-material-importer.service';
export declare class ErpMaterialImporterController {
    private readonly service;
    constructor(service: ErpMaterialImporterService);
    uploadFile(file: Express.Multer.File): Promise<{
        message: string;
    }>;
}
