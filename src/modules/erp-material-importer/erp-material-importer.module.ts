import { Module } from '@nestjs/common';
import { ErpMaterialImporterService } from './erp-material-importer.service';
import { ErpMaterialImporterController } from './erp-material-importer.controller';
import { PrismaService } from '../../prisma.service';
import { SftpModule } from '../sftp/sftp.module';

@Module({
  imports: [SftpModule], 
  controllers: [ErpMaterialImporterController],
  providers: [ErpMaterialImporterService, PrismaService],
  exports: [ErpMaterialImporterService],
})
export class ErpMaterialImporterModule {}