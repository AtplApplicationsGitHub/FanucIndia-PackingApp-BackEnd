import {
  BadRequestException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { AUDIT_TYPE, AUDIT_TYPE_VALUES } from '../shared/audit.constants';
import {
  BomReconciliationService,
  RECON_ERROR,
} from '../bom-completeness/bom-reconciliation.service';
import { ReviewReconciliationDto } from './dto/review-reconciliation.dto';
import { BulkReviewReconciliationDto } from './dto/bulk-review-reconciliation.dto';
import {
  RECON_DECISION_OPTIONS,
  RECON_DEFAULT_SAP_ACTION,
  RECON_SAP_ACTION_OPTIONS,
} from '../shared/reconciliation-options';
import { QueryReconciliationLinesDto } from './dto/query-reconciliation-lines.dto';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly bomReconciliationService: BomReconciliationService,
  ) {}

  private getService(auditType: string): BomReconciliationService {
    if (!AUDIT_TYPE_VALUES.some((value) => value === auditType)) {
      throw new BadRequestException({
        code: RECON_ERROR.INVALID_AUDIT_TYPE,
        message: 'Invalid auditType.',
      });
    }

    if (auditType === AUDIT_TYPE.BOM_COMPLETENESS) {
      return this.bomReconciliationService;
    }

    throw new NotImplementedException({
      code: RECON_ERROR.NOT_AVAILABLE,
      message: `${auditType} reconciliation is not available yet.`,
    });
  }

  options() {
    return {
      message: 'Reconciliation options fetched successfully.',
      data: {
        decisions: RECON_DECISION_OPTIONS,
        sapActions: RECON_SAP_ACTION_OPTIONS,
        defaultSapAction: RECON_DEFAULT_SAP_ACTION,
      },
    };
  }

  detail(auditType: string, id: number) {
    return this.getService(auditType).detail(id);
  }

  lines(auditType: string, id: number, query: QueryReconciliationLinesDto) {
    return this.getService(auditType).lines(id, query);
  }

  review(
    auditType: string,
    id: number,
    varianceId: number,
    dto: ReviewReconciliationDto,
    userName: string,
  ) {
    return this.getService(auditType).review(
      id,
      varianceId,
      {
        decision: dto.decision,
        sapAction: dto.sapAction ?? RECON_DEFAULT_SAP_ACTION,
        remarks: dto.remarks,
      },
      userName,
    );
  }

  bulkReview(
    auditType: string,
    id: number,
    dto: BulkReviewReconciliationDto,
    userName: string,
  ) {
    return this.getService(auditType).bulkReview(
      id,
      dto.varianceIds,
      {
        decision: dto.decision,
        sapAction: dto.sapAction ?? RECON_DEFAULT_SAP_ACTION,
        remarks: dto.remarks,
      },
      userName,
    );
  }

  close(auditType: string, id: number, userName: string) {
    return this.getService(auditType).close(id, userName);
  }
}
