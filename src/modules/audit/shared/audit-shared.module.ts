import { Module } from '@nestjs/common';
import { AuditOperatorsService } from './audit-operators.service';

@Module({
  providers: [AuditOperatorsService],
  exports: [AuditOperatorsService],
})
export class AuditSharedModule {}
