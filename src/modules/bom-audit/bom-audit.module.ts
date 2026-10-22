import { Module } from '@nestjs/common';
import { BomAuditController } from './bom-audit.controller';
import { BomAuditService } from './bom-audit.service';
import { BomAuditMobileController } from './bom-audit-mobile.controller';
import { BomAuditMobileService } from './bom-audit-mobile.service';

@Module({
  controllers: [BomAuditController, BomAuditMobileController],
  providers: [BomAuditService, BomAuditMobileService],
})
export class BomAuditModule {}
