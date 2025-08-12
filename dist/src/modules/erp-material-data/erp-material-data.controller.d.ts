import { ErpMaterialDataService } from './erp-material-data.service';
import { UpdateIssueStageDto } from './dto/update-issue-stage.dto';
import { IncrementIssueStageDto } from './dto/increment-issue-stage.dto';
import { UpdatePackingStageDto } from './dto/update-packing-stage.dto';
import { IncrementPackingStageDto } from './dto/increment-packing-stage.dto';
export declare class ErpMaterialDataController {
    private readonly erpMaterialDataService;
    constructor(erpMaterialDataService: ErpMaterialDataService);
    getMaterialsByOrderId(orderId: number): Promise<any>;
    incrementIssueStage(orderId: number, body: IncrementIssueStageDto): Promise<any>;
    updateIssueStage(orderId: number, body: UpdateIssueStageDto): Promise<any>;
    incrementPackingStage(orderId: number, body: IncrementPackingStageDto): Promise<any>;
    updatePackingStage(orderId: number, body: UpdatePackingStageDto): Promise<any>;
}
