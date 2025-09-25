import { Module } from '@nestjs/common';
import { FgStorageController } from './fg-storage.controller';
import { FgStorageService } from './fg-storage.service';

@Module({
  controllers: [FgStorageController],
  providers: [FgStorageService],
})
export class FgStorageModule {}