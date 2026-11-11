import { CycleCountAuditModule } from '../cycle-count/cycle-count-audit.module';
import { Module } from '@nestjs/common';
import { BomAuditModule } from '../bom-completeness/bom-audit.module';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [BomAuditModule, CycleCountAuditModule],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
})
export class ReconciliationModule {}
