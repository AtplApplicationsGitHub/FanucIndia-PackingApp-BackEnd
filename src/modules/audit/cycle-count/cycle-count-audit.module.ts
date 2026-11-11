import { CycleCountReconciliationService } from './cycle-count-reconciliation.service';
import { SftpModule } from '../../sftp/sftp.module';
import { CycleCountAuditMobileController } from './cycle-count-mobile.controller';
import { CycleCountAuditMobileService } from './cycle-count-mobile.service';
import { CycleCountAuditReportService } from './cycle-count-report.service';
import { Module } from '@nestjs/common';
import { AuditSharedModule } from '../shared/audit-shared.module';
import { BomAuditColumnConfigService } from '../bom-completeness/bom-audit-column-config.service';
import { CycleCountAuditController } from './cycle-count-audit.controller';
import { CycleCountAuditService } from './cycle-count-audit.service';
import { CycleCountSourceService } from './cycle-count-source.service';

@Module({
  imports: [AuditSharedModule, SftpModule],
  controllers: [CycleCountAuditController, CycleCountAuditMobileController],
  providers: [CycleCountReconciliationService, CycleCountAuditMobileService, CycleCountAuditReportService, CycleCountAuditService, CycleCountSourceService, BomAuditColumnConfigService],
  exports: [CycleCountAuditService, CycleCountReconciliationService],
})
export class CycleCountAuditModule {}
