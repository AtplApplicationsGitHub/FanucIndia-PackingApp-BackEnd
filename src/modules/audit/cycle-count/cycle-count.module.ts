import { Module } from '@nestjs/common';
import { CycleCountController } from './cycle-count.controller';
import { CycleCountService } from './cycle-count.service';
import { CycleCountMovementService } from './cycle-count-movement.service';
import { AuditSharedModule } from '../shared/audit-shared.module';

@Module({
  imports: [AuditSharedModule],
  controllers: [CycleCountController],
  providers: [CycleCountService, CycleCountMovementService],
  exports: [CycleCountService],
})
export class CycleCountModule {}
