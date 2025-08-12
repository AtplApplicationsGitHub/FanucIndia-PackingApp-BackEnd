import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SftpService } from './sftp.service';

@Module({
  imports: [ConfigModule],
  providers: [SftpService],
  exports: [SftpService],
})
export class SftpModule {}
