import { Module } from '@nestjs/common';
import { BomAuditModule } from '../bom-completeness/bom-audit.module';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [BomAuditModule],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
})
export class ReconciliationModule {}
