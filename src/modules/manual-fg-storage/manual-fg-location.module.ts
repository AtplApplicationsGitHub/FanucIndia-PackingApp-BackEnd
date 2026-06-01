import { Module } from '@nestjs/common';
import { ManualFgStorageController } from './manual-fg-location.controller';
import { ManualFgStorageService } from './manual-fg-location.service';

@Module({
  controllers: [ManualFgStorageController],
  providers: [ManualFgStorageService],
})
export class ManualFgStorageModule {}
