import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma.service';

type PreviewItem = { stockItemId: number; version: string };

@Injectable()
export class FreeStockPreviewActivityService {
  private readonly logger = new Logger(FreeStockPreviewActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    salesUserId: number,
    expiresAt: Date,
    items: PreviewItem[],
  ): Promise<string | undefined> {
    if (!items.length) return;

    const previewId = randomUUID();
    try {
      // Keep each statement below the database parameter limit for large Excel previews.
      const batches = [];
      for (let offset = 0; offset < items.length; offset += 500) {
        batches.push(
          this.prisma.freeStockReservationPreviewItem.createMany({
            data: items.slice(offset, offset + 500).map((item) => ({
              previewId,
              stockItemId: item.stockItemId,
              salesUserId,
              stockUpdatedAt: new Date(item.version),
              expiresAt,
            })),
            skipDuplicates: true,
          }),
        );
      }
      await this.prisma.$transaction(batches);
      return previewId;
    } catch (error) {
      // The indicator is optional and must not invalidate a successful preview.
      this.logger.warn(
        'Unable to record Free Stock preview activity.',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async list(stockItemIds: number[], salesUserId: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT stock."id"
      FROM "FreeStockItem" AS stock
      WHERE stock."id" IN (${Prisma.join(stockItemIds)})
        AND stock."status" = 'OPEN'
        AND EXISTS (
          SELECT 1
          FROM "FreeStockReservationPreviewItem" AS preview
          WHERE preview."stockItemId" = stock."id"
            AND preview."stockUpdatedAt" = stock."updatedAt"
            AND preview."salesUserId" <> ${salesUserId}
            AND preview."expiresAt" > CURRENT_TIMESTAMP
        )
    `;
    return rows.map(({ id }) => id);
  }

  async cancel(previewId: string, salesUserId: number): Promise<void> {
    await this.prisma.freeStockReservationPreviewItem.deleteMany({
      where: { previewId, salesUserId },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async clearExpired(): Promise<void> {
    await this.prisma.freeStockReservationPreviewItem.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }
}
