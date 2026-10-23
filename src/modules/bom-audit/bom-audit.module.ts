import { Module } from '@nestjs/common';
import { BomAuditController } from './bom-audit.controller';
import { BomAuditService } from './bom-audit.service';
import { BomAuditMobileController } from './bom-audit-mobile.controller';
import { BomAuditMobileService } from './bom-audit-mobile.service';
import { BomAuditReportService } from './bom-audit-report.service';
import { SftpModule } from '../sftp/sftp.module';

@Module({
  // SftpModule: the report Excel is saved on the SFTP server after submit
  imports: [SftpModule],
  // BomAuditController = web (admin), BomAuditMobileController = handheld (Stage B)
  controllers: [BomAuditController, BomAuditMobileController],
  providers: [BomAuditService, BomAuditMobileService, BomAuditReportService],
})
export class BomAuditModule {}
