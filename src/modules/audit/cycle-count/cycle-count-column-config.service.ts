import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { BOM_AUDIT_HEADER_ALIASES, type BomAuditHeaderAliases, type BomAuditHeaderField } from '../bom-completeness/bom-audit.constants';
import { configuredHeaders } from '../shared/excel-column-config.util';

export const CYCLE_COUNT_COLUMN_CONFIG_KEYS: Record<BomAuditHeaderField, string> = {
  materialCode: 'CYCLE_COUNT_COLUMN_MATERIAL',
  storageBin: 'CYCLE_COUNT_COLUMN_STORAGE_BIN',
  qty: 'CYCLE_COUNT_COLUMN_QTY',
  ydNumber: 'CYCLE_COUNT_COLUMN_YD',
  batch: 'CYCLE_COUNT_COLUMN_BATCH',
  operatorId: 'CYCLE_COUNT_COLUMN_OPERATOR',
};

@Injectable()
export class CycleCountColumnConfigService {
  constructor(private readonly prisma: PrismaService) {}
  getHeaderAliases(): Promise<BomAuditHeaderAliases> {
    return configuredHeaders(this.prisma, CYCLE_COUNT_COLUMN_CONFIG_KEYS, BOM_AUDIT_HEADER_ALIASES);
  }
}
