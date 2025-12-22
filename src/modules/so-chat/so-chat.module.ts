import { Module } from '@nestjs/common';
import { SoChatController } from './so-chat.controller';
import { SoChatService } from './so-chat.service';

@Module({
  controllers: [SoChatController],
  providers: [SoChatService],
})
export class SoChatModule {}
