import { Module } from '@nestjs/common';
import { BomAuditController } from './bom-audit.controller';
import { BomAuditService } from './bom-audit.service';
import { BomAuditMobileController } from './bom-audit-mobile.controller';
import { BomAuditMobileService } from './bom-audit-mobile.service';
import { BomAuditReportService } from './bom-audit-report.service';
import { SftpModule } from '../../sftp/sftp.module';
import { AuditSharedModule } from '../shared/audit-shared.module';

@Module({
  imports: [SftpModule, AuditSharedModule],
  controllers: [BomAuditController, BomAuditMobileController],
  providers: [BomAuditService, BomAuditMobileService, BomAuditReportService],
  exports: [BomAuditService],
})
export class BomAuditModule {}
