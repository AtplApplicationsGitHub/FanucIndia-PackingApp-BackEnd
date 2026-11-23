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

  async list(stockItemIds: number[], salesUserId: number) {
    const rows = await this.prisma.$queryRaw<
      { id: number; isOpen: boolean; isBeingPreviewed: boolean }[]
    >`
      SELECT stock."id",
        stock."status" = 'OPEN' AS "isOpen",
        CASE WHEN stock."status" = 'OPEN' THEN EXISTS (
          SELECT 1
          FROM "FreeStockReservationPreviewItem" AS preview
          WHERE preview."stockItemId" = stock."id"
            AND preview."stockUpdatedAt" = stock."updatedAt"
            AND preview."salesUserId" <> ${salesUserId}
            AND preview."expiresAt" > CURRENT_TIMESTAMP
        ) ELSE FALSE END AS "isBeingPreviewed"
      FROM "FreeStockItem" AS stock
      WHERE stock."id" IN (${Prisma.join(stockItemIds)})
    `;
    const openIds = new Set(rows.filter((row) => row.isOpen).map((row) => row.id));
    return {
      stockItemIds: rows.filter((row) => row.isBeingPreviewed).map((row) => row.id),
      staleStockItemIds: stockItemIds.filter((id) => !openIds.has(id)),
    };
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
