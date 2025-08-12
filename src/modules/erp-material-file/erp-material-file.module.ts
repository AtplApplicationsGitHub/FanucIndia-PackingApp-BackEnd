import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma.module';
import { SftpModule } from '../sftp/sftp.module';
import { ErpMaterialFileController } from './erp-material-file.controller';
import { ErpMaterialFileService } from './erp-material-file.service';

@Module({
  imports: [PrismaModule, SftpModule],
  controllers: [ErpMaterialFileController],
  providers: [ErpMaterialFileService],
  exports: [ErpMaterialFileService],
})
export class ErpMaterialFileModule {}
