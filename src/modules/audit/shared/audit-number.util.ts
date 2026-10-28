import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AUDIT_NO_DIGITS,
  AUDIT_NO_MAX_PER_MONTH,
  AUDIT_TIME_ZONE,
} from './audit.constants';

function istMonthYear(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: AUDIT_TIME_ZONE,
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now);
  return {
    month: parts.find((p) => p.type === 'month')?.value ?? '',
    year: parts.find((p) => p.type === 'year')?.value ?? '',
  };
}

export function auditNoMonthPrefix(prefix: string, now: Date = new Date()): string {
  const { month, year } = istMonthYear(now);
  return `${prefix}-${month}-${year}-`;
}

export async function nextAuditNo(
  tx: Prisma.TransactionClient,
  options: {
    prefix: string;
    lockKey: number;
    findLastAuditNo: (startsWith: string) => Promise<string | null>;
  },
): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${options.lockKey}::bigint)`;

  const now = new Date();
  const { month, year } = istMonthYear(now);
  const period = `${month}-${year}`;
  const prefix = auditNoMonthPrefix(options.prefix, now);

  const counter = await tx.auditNoSequence.findUnique({
    where: { prefix_period: { prefix: options.prefix, period } },
    select: { lastNumber: true },
  });

  let lastNumber = counter?.lastNumber;
  if (lastNumber === undefined) {
    const last = await options.findLastAuditNo(prefix);
    const fromTable = last ? Number(last.slice(prefix.length)) : 0;
    lastNumber = Number.isFinite(fromTable) ? fromTable : 0;
  }
  const next = lastNumber + 1;

  if (next > AUDIT_NO_MAX_PER_MONTH) {
    throw new ConflictException({
      code: 'AUDIT_NO_LIMIT_REACHED',
      message: `The monthly limit of ${AUDIT_NO_MAX_PER_MONTH} audits for ${options.prefix} has been reached. Please contact the DIMS support team.`,
    });
  }

  await tx.auditNoSequence.upsert({
    where: { prefix_period: { prefix: options.prefix, period } },
    create: { prefix: options.prefix, period, lastNumber: next },
    update: { lastNumber: next },
  });

  return `${prefix}${String(next).padStart(AUDIT_NO_DIGITS, '0')}`;
}
