import { Module } from '@nestjs/common';
import { IbdPrintController } from './ibd-print.controller';
import { IbdPrintService } from './ibd-print.service';

@Module({
  controllers: [IbdPrintController],
  providers: [IbdPrintService],
})
export class IbdPrintModule {}
