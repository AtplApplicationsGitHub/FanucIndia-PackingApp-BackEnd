import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { normaliseHeader } from '../shared/audit-excel.util';
import {
  BOM_AUDIT_COLUMN_CONFIG_KEYS,
  BOM_AUDIT_HEADER_ALIASES,
  type BomAuditHeaderAliases,
  type BomAuditHeaderField,
} from './bom-audit.constants';

@Injectable()
export class BomAuditColumnConfigService {
  private readonly logger = new Logger(BomAuditColumnConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHeaderAliases(): Promise<BomAuditHeaderAliases> {
    const fields = Object.keys(BOM_AUDIT_COLUMN_CONFIG_KEYS) as BomAuditHeaderField[];

    let values = new Map<string, string>();
    try {
      const rows = await this.prisma.systemConfig.findMany({
        where: { key: { in: Object.values(BOM_AUDIT_COLUMN_CONFIG_KEYS) } },
        select: { key: true, value: true },
      });
      values = new Map(rows.map((row) => [row.key, row.value]));
    } catch (error) {
      this.logger.warn(
        `BOM audit column settings could not be read, using the defaults - ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    const aliases = {} as Record<BomAuditHeaderField, readonly string[]>;
    for (const field of fields) {
      const key = BOM_AUDIT_COLUMN_CONFIG_KEYS[field];
      const configured = this.toAliases(values.get(key));
      if (values.has(key) && configured.length === 0) {
        this.logger.warn(`SystemConfig ${key} is empty, using the default header names.`);
      }
      aliases[field] = configured.length ? configured : BOM_AUDIT_HEADER_ALIASES[field];
    }
    return aliases;
  }

  private toAliases(value: string | undefined): string[] {
    if (!value) return [];
    return [
      ...new Set(
        value
          .split(/[,;\n]/)
          .map((part) => normaliseHeader(part))
          .filter(Boolean),
      ),
    ];
  }
}
