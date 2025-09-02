import { Module } from '@nestjs/common';
import { FgDashboardController } from './fg-dashboard.controller';
import { FgDashboardService } from './fg-dashboard.service';

@Module({
  controllers: [FgDashboardController],
  providers: [FgDashboardService],
})
export class FgDashboardModule {}