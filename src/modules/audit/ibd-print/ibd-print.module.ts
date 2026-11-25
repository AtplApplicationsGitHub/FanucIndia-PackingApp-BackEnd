import { Module } from '@nestjs/common';
import { SftpModule } from '../../sftp/sftp.module';
import { IbdPrintController } from './ibd-print.controller';
import { IbdPrintLabelService } from './ibd-print-label.service';
import { IbdPrintService } from './ibd-print.service';

@Module({
  imports: [SftpModule],
  controllers: [IbdPrintController],
  providers: [IbdPrintService, IbdPrintLabelService],
})
export class IbdPrintModule {}
