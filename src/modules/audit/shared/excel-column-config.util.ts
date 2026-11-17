import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { normaliseHeader } from './audit-excel.util';

/** Each upload format has independent SystemConfig keys. Values are comma-separated header aliases. */
export async function configuredHeaders<T extends string>(
  prisma: PrismaService,
  keys: Record<T, string>,
  defaults: Record<T, readonly string[]>,
): Promise<Record<T, readonly string[]>> {
  const rows = await prisma.systemConfig.findMany({ where: { key: { in: Object.values(keys) as string[] } }, select: { key: true, value: true } });
  const saved = new Map(rows.map((row) => [row.key, row.value]));
  const result = {} as Record<T, readonly string[]>;
  for (const field of Object.keys(keys) as T[]) {
    const raw = saved.get(keys[field]);
    const aliases = raw === undefined ? defaults[field].map(normaliseHeader)
      : [...new Set(raw.split(/[,;\n]/).map(normaliseHeader).filter(Boolean))];
    if (!aliases.length) throw new BadRequestException(`SystemConfig ${keys[field]} must contain at least one Excel header name.`);
    result[field] = aliases;
  }
  return result;
}
