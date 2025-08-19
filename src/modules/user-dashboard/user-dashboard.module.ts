import { Module } from '@nestjs/common';
import { UserDashboardController } from './user-dashboard.controller';
import { UserDashboardService } from './user-dashboard.service';

@Module({
  controllers: [UserDashboardController],
  providers: [UserDashboardService],
})
export class UserDashboardModule {}
