import { Module } from '@nestjs/common';
import { SoChatController } from './so-chat.controller';
import { SoChatService } from './so-chat.service';
import { SoNotificationsModule } from '../so-notifications/so-notifications.module';

@Module({
  imports: [SoNotificationsModule], 
  controllers: [SoChatController],
  providers: [SoChatService],
})
export class SoChatModule {}