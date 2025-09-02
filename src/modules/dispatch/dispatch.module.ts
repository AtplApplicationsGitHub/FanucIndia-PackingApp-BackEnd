import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { SftpModule } from '../sftp/sftp.module';

@Module({
  imports: [SftpModule],
  controllers: [DispatchController],
  providers: [DispatchService],
})
export class DispatchModule {}
