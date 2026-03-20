import { Module } from '@nestjs/common';
import { SambaController } from './samba.controller';
import { SambaService } from './samba.service';
import { SftpModule } from '../sftp/sftp.module';

@Module({
  imports: [SftpModule],
  controllers: [SambaController],
  providers: [SambaService],
})
export class SambaModule {}