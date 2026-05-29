import { Module } from '@nestjs/common';
import { ManualFgStorageController } from './manual-fg-storage.controller';
import { ManualFgStorageService } from './manual-fg-storage.service';

@Module({
  controllers: [ManualFgStorageController],
  providers: [ManualFgStorageService],
})
export class ManualFgStorageModule {}
