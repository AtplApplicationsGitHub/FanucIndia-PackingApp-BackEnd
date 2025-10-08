import { Module } from '@nestjs/common';
import { SoArchiveService } from './so-archive.service';
import { SoArchiveController } from './so-archive.controller';
import { PrismaModule } from '../../prisma.module';
import { SftpModule } from '../sftp/sftp.module';

@Module({
  imports: [PrismaModule, SftpModule],
  controllers: [SoArchiveController],
  providers: [SoArchiveService],
})
export class SoArchiveModule {}