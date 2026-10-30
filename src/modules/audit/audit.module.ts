import { Module } from '@nestjs/common';
import { AuditSharedModule } from './shared/audit-shared.module';
import { BomAuditModule } from './bom-completeness/bom-audit.module';
import { CycleCountModule } from './cycle-count/cycle-count.module';
import { AuditController } from './audit.controller';
import { AuditMobileController } from './audit-mobile.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [AuditSharedModule, BomAuditModule, CycleCountModule],
  controllers: [AuditController, AuditMobileController],
  providers: [AuditService],
})
export class AuditModule {}
