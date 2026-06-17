import { Module } from '@nestjs/common';
import { UserDashboardController } from './user-dashboard.controller';
import { UserDashboardService } from './user-dashboard.service';
import { SftpModule } from '../sftp/sftp.module';
import { EfficiencyModule } from '../efficiency/efficiency.module';

@Module({
  imports: [SftpModule, EfficiencyModule],
  controllers: [UserDashboardController],
  providers: [UserDashboardService],
})
export class UserDashboardModule {}