import { Module } from '@nestjs/common';
import { AuditSharedModule } from '../shared/audit-shared.module';
import { BomAuditColumnConfigService } from '../bom-completeness/bom-audit-column-config.service';
import { CycleCountAuditController } from './cycle-count-audit.controller';
import { CycleCountAuditService } from './cycle-count-audit.service';
import { CycleCountSourceService } from './cycle-count-source.service';

@Module({
  imports: [AuditSharedModule],
  controllers: [CycleCountAuditController],
  providers: [CycleCountAuditService, CycleCountSourceService, BomAuditColumnConfigService],
  exports: [CycleCountAuditService],
})
export class CycleCountAuditModule {}
