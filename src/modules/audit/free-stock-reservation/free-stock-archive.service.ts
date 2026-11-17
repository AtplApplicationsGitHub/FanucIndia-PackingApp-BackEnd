import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma.service';

export function freeStockArchiveDays(value = process.env.FREE_STOCK_ARCHIVE_AFTER_DAYS): number {
  const days = value === undefined ? 3 : Number(value);
  if (!Number.isSafeInteger(days) || days < 1 || days > 36500) throw new Error('FREE_STOCK_ARCHIVE_AFTER_DAYS must be a whole number between 1 and 36500.');
  return days;
}

@Injectable()
export class FreeStockArchiveService {
  private readonly logger = new Logger(FreeStockArchiveService.name);
  private readonly days = freeStockArchiveDays();
  private running = false;
  constructor(private readonly prisma: PrismaService) {}

  /** Drain eligible rows in bounded transactions, releasing the shared import/booking lock between batches. */
  @Cron('0 0 * * * *', { timeZone: 'Asia/Kolkata' })
  async archiveClosedRows() {
    if (this.running) return 0;
    this.running = true;
    let total = 0;
    const cutoff = new Date(Date.now() - this.days * 86400000);
    try {
      while (true) {
        const count = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(74020005::bigint)::text`;
        const items = await tx.freeStockItem.findMany({
          where: { status: 'CLOSED', closedAt: { lte: cutoff } }, orderBy: { id: 'asc' }, take: 500,
        });
        if (!items.length) return 0;
        const ids = items.map((item) => item.id);
        const reservations = await tx.freeStockReservation.findMany({ where: { stockItemId: { in: ids } } });
        const archivedAt = new Date();
        const copied = await tx.freeStockItemArchive.createMany({ data: items.map((item) => ({ ...item, archivedAt })) });
        if (copied.count !== items.length) throw new Error('Stock archive copy is incomplete.');
        for (let start = 0; start < reservations.length; start += 500) {
          const chunk = reservations.slice(start, start + 500);
          const history = await tx.freeStockReservationArchive.createMany({ data: chunk.map((row) => ({ ...row, archivedAt })) });
          if (history.count !== chunk.length) throw new Error('Reservation archive copy is incomplete.');
        }
        await tx.freeStockReservation.deleteMany({ where: { stockItemId: { in: ids } } });
        const removed = await tx.freeStockItem.deleteMany({ where: { id: { in: ids }, status: 'CLOSED', closedAt: { lte: cutoff } } });
        if (removed.count !== items.length) throw new Error('Stock changed while archiving.');
        return removed.count;
        }, { maxWait: 10000, timeout: 180000 });
        total += count;
        if (count < 500) break;
      }
      if (total) this.logger.log(`Archived ${total} Free Stock rows and their reservation history after ${this.days} days.`);
      return total;
    } catch (error) {
      this.logger.error(`Free Stock archival failed; the failing batch was rolled back. ${total} rows were archived in earlier batches.`, error instanceof Error ? error.stack : String(error));
      return total;
    } finally {
      this.running = false;
    }
  }
}
