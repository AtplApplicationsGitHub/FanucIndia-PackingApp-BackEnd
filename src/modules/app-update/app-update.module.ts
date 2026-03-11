import { Module } from '@nestjs/common';
import { AppUpdateController } from './app-update.controller';
import { AppUpdateService } from './app-update.service';
import { SftpModule } from '../sftp/sftp.module'; 

@Module({
  imports: [SftpModule],
  controllers: [AppUpdateController],
  providers: [AppUpdateService],
})
export class AppUpdateModule {}