import { ErpMaterialDataService } from './erp-material-data.service';
import { UpdateIssueStageDto } from './dto/update-issue-stage.dto';
import { IncrementIssueStageDto } from './dto/increment-issue-stage.dto';
export declare class ErpMaterialDataController {
    private readonly erpMaterialDataService;
    constructor(erpMaterialDataService: ErpMaterialDataService);
    getMaterialsByOrderId(orderId: number): Promise<any>;
    incrementIssueStage(orderId: number, body: IncrementIssueStageDto): Promise<any>;
    updateIssueStage(orderId: number, body: UpdateIssueStageDto): Promise<any>;
}
