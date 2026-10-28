import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';
import { CYCLE_COUNT_MOVEMENT } from './cycle-count.constants';

export interface BinMovement {
  lines: number;
  transferOrders: number;
  archivedLines: number;
}

export interface MovementResult {
  byBin: Map<string, BinMovement>;
  totals: { lines: number; liveLines: number; archivedLines: number; locationsMoved: number };
}

@Injectable()
export class CycleCountMovementService {
  constructor(private readonly prisma: PrismaService) {
    if (!(CYCLE_COUNT_MOVEMENT.allowedDateColumns as readonly string[]).includes(CYCLE_COUNT_MOVEMENT.dateColumn)) {
      throw new Error(`Invalid CYCLE_COUNT_MOVEMENT.dateColumn "${CYCLE_COUNT_MOVEMENT.dateColumn}"`);
    }
  }

  async countByBin(
    bins: string[],
    from: Date,
    toExclusive: Date,
    includeArchived: boolean,
  ): Promise<MovementResult> {
    const byBin = new Map<string, BinMovement>();
    const totals = { lines: 0, liveLines: 0, archivedLines: 0, locationsMoved: 0 };
    if (!bins.length) return { byBin, totals };

    const dateCol = Prisma.raw(`"${CYCLE_COUNT_MOVEMENT.dateColumn}"`);
    const fromIso = from.toISOString();
    const toIso = toExclusive.toISOString();

    const live = Prisma.sql`
      SELECT UPPER(TRIM("Bin_No")) AS bin, "transferOrder" AS tor, 0 AS archived
      FROM ${Prisma.raw(`"${CYCLE_COUNT_MOVEMENT.liveTable}"`)}
      WHERE ${dateCol} >= ${fromIso}::timestamptz AND ${dateCol} < ${toIso}::timestamptz`;

    const archived = Prisma.sql`
      SELECT UPPER(TRIM("Bin_No")) AS bin, "transferOrder" AS tor, 1 AS archived
      FROM ${Prisma.raw(`"${CYCLE_COUNT_MOVEMENT.archiveTable}"`)}
      WHERE ${dateCol} >= ${fromIso}::timestamptz AND ${dateCol} < ${toIso}::timestamptz`;

    const source = includeArchived ? Prisma.sql`${live} UNION ALL ${archived}` : live;

    const rows = await this.prisma.$queryRaw<
      { bin: string; lines: number; transfer_orders: number; archived_lines: number }[]
    >`
      SELECT m.bin,
             COUNT(*)::int AS lines,
             COUNT(DISTINCT NULLIF(TRIM(m.tor), ''))::int AS transfer_orders,
             COALESCE(SUM(m.archived), 0)::int AS archived_lines
      FROM (${source}) AS m
      WHERE m.bin = ANY(${bins}::text[])
      GROUP BY m.bin`;

    for (const r of rows) {
      byBin.set(r.bin, { lines: r.lines, transferOrders: r.transfer_orders, archivedLines: r.archived_lines });
      totals.lines += r.lines;
      totals.archivedLines += r.archived_lines;
    }
    totals.liveLines = totals.lines - totals.archivedLines;
    totals.locationsMoved = rows.length;
    return { byBin, totals };
  }
}
