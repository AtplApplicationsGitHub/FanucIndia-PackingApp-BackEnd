import { Module } from '@nestjs/common';
import { BomAuditController } from './bom-audit.controller';
import { BomAuditService } from './bom-audit.service';

@Module({
  controllers: [BomAuditController],
  providers: [BomAuditService],
})
export class BomAuditModule {}
