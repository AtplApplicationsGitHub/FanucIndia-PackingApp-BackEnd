import { Module } from '@nestjs/common';
import { SoNotificationsController } from './so-notifications.controller';
import { SoNotificationsGateway } from './so-notifications.gateway';
import { SoNotificationsService } from './so-notifications.service';
import { AuthModule } from '../auth/auth.module'; 

@Module({
  imports: [AuthModule], 
  controllers: [SoNotificationsController],
  providers: [SoNotificationsService, SoNotificationsGateway],
  exports: [SoNotificationsService],
})
export class SoNotificationsModule {}
