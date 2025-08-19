import { ErpMaterialDataService } from './erp-material-data.service';
import { UpdateIssueStageDto } from './dto/update-issue-stage.dto';
import { IncrementIssueStageDto } from './dto/increment-issue-stage.dto';
import { UpdatePackingStageDto } from './dto/update-packing-stage.dto';
import { IncrementPackingStageDto } from './dto/increment-packing-stage.dto';
import { AuthRequest } from '../auth/types/auth-request.type';
export declare class ErpMaterialDataController {
    private readonly erpMaterialDataService;
    constructor(erpMaterialDataService: ErpMaterialDataService);
    getMaterialsByOrderId(orderId: number, req: AuthRequest): Promise<any>;
    incrementIssueStage(orderId: number, body: IncrementIssueStageDto, req: AuthRequest): Promise<any>;
    updateIssueStage(orderId: number, body: UpdateIssueStageDto, req: AuthRequest): Promise<any>;
    incrementPackingStage(orderId: number, body: IncrementPackingStageDto, req: AuthRequest): Promise<any>;
    updatePackingStage(orderId: number, body: UpdatePackingStageDto, req: AuthRequest): Promise<any>;
}
