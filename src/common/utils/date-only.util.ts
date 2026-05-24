// backend/common/utils/date-only.util.ts

import { BadRequestException } from '@nestjs/common';

export function parseYmdDateOnly(value?: string | null): Date | undefined {
  if (!value || !String(value).trim()) return undefined;

  const raw = String(value).trim();

  /**
   * Accept only the date part.
   * Expected API input should be YYYY-MM-DD.
   */
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

  if (!match) {
    throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
  }

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  if (!y || m < 1 || m > 12 || d < 1 || d > 31) {
    throw new BadRequestException('Invalid date value.');
  }

  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
      0,
      0,
      0,
      0,
    ),
  );
}

export function getDateOnlyRange(startDate?: string, endDate?: string) {
  const start = parseYmdDateOnly(startDate);
  const end = parseYmdDateOnly(endDate);

  if (!start && !end) return undefined;

  const range: { gte?: Date; lt?: Date } = {};

  if (start) range.gte = start;
  if (end) range.lt = addUtcDays(end, 1);

  return range;
}

export function getSingleDateOnlyRange(date?: string) {
  const start = parseYmdDateOnly(date);
  if (!start) return undefined;

  return {
    gte: start,
    lt: addUtcDays(start, 1),
  };
}

export function normalizeDateOnlyForWrite(
  value?: string | null,
): string | undefined {
  const parsed = parseYmdDateOnly(value);
  return parsed ? parsed.toISOString() : undefined;
}

/**
 * Use this only for timestamp columns:
 * createdAt, updatedAt, createdDateTime, UpdatedDate, archivedAt, etc.
 *
 * Do NOT use this for deliveryDate.
 */
export function getIstTimestampRange(dateStr?: string) {
  const dateOnly = parseYmdDateOnly(dateStr);
  if (!dateOnly) return undefined;

  const y = dateOnly.getUTCFullYear();
  const m = dateOnly.getUTCMonth();
  const d = dateOnly.getUTCDate();

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  return {
    startOfDay: new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS),
    endOfDay: new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0) - IST_OFFSET_MS),
  };
}