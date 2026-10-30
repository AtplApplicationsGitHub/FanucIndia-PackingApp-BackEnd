import {
  BadRequestException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { AUDIT_TYPE, AUDIT_TYPE_VALUES } from '../shared/audit.constants';
import { BomReconciliationService } from '../bom-completeness/bom-reconciliation.service';
import { ReviewReconciliationDto } from './dto/review-reconciliation.dto';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly bomReconciliationService: BomReconciliationService,
  ) {}

  private getService(auditType: string): BomReconciliationService {
    if (!AUDIT_TYPE_VALUES.some((value) => value === auditType)) {
      throw new BadRequestException('Invalid auditType.');
    }

    if (auditType === AUDIT_TYPE.BOM_COMPLETENESS) {
      return this.bomReconciliationService;
    }

    throw new NotImplementedException(
      `${auditType} reconciliation is not available yet.`,
    );
  }

  detail(auditType: string, id: number) {
    return this.getService(auditType).detail(id);
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
        sapAction: dto.sapAction ?? 'NONE',
        remarks: dto.remarks,
      },
      userName,
    );
  }

  close(auditType: string, id: number, userName: string) {
    return this.getService(auditType).close(id, userName);
  }
}
