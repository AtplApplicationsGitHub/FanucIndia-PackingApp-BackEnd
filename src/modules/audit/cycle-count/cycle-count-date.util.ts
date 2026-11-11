import { BadRequestException } from '@nestjs/common';
import { getIstTimestampRange } from '../../../common/utils/date-only.util';

export function parseCycleCountDate(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      message: 'fromDate and toDate must be valid dates in YYYY-MM-DD format.',
    });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    date.getUTCFullYear() < 1
  ) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      message: 'fromDate and toDate must be real calendar dates.',
    });
  }
  return date;
}

export function cycleCountDateRange(fromDate: string, toDate: string) {
  const from = parseCycleCountDate(fromDate);
  const to = parseCycleCountDate(toDate);
  if (to < from) {
    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'TO date must be on or after FROM date.',
    });
  }
  const nextMonth = new Date(from);
  nextMonth.setUTCDate(1);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const lastDay = new Date(nextMonth);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1);
  lastDay.setUTCDate(0);
  nextMonth.setUTCDate(Math.min(from.getUTCDate(), lastDay.getUTCDate()));
  if (to > nextMonth) {
    throw new BadRequestException({
      code: 'DATE_RANGE_EXCEEDS_ONE_MONTH',
      message: `TO date cannot be later than ${nextMonth.toISOString().slice(0, 10)} for this FROM date.`,
    });
  }
  return {
    start: getIstTimestampRange(fromDate)!.startOfDay,
    end: getIstTimestampRange(toDate)!.endOfDay,
  };
}
