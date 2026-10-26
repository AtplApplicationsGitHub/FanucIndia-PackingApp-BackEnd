import { Module } from '@nestjs/common';
import { CycleCountController } from './cycle-count.controller';
import { CycleCountService } from './cycle-count.service';
import { CycleCountMovementService } from './cycle-count-movement.service';

/** Phase 2 - Cycle Count audit. Phase A (web: stock upload, movement analysis, plan, release). */
@Module({
  controllers: [CycleCountController],
  providers: [CycleCountService, CycleCountMovementService],
})
export class CycleCountModule {}
