import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

function getBinCategory(binCount: number | null | undefined): string {
  const count = binCount ?? 0;
  if (count <= 1) return '1';
  if (count <= 3) return '2-3';
  return '>=4';
}

function diffMinutes(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}

@Injectable()
export class EfficiencyService {
  constructor(private readonly prisma: PrismaService) {}

  async recordStageCompletion(
    orderId: number,
    stage: 'Issue' | 'Packing',
  ): Promise<void> {
    try {
      const order = await this.prisma.salesOrder.findUnique({
        where: { id: orderId },
        select: {
          saleOrderNumber: true,
          outboundDelivery: true,
          deliveryDate: true,
          binCount: true,
          skipIssueStage: true,
          skipPackingStage: true,
          issueAssignedUserId: true,
          packingAssignedUserId: true,
          IA_Time: true,
          PA_Time: true,
        },
      });

      if (!order) return;

      // Skip if the stage is flagged as skipped
      if (stage === 'Issue' && order.skipIssueStage === true) return;
      if (stage === 'Packing' && order.skipPackingStage === true) return;

      const assignedUserId =
        stage === 'Issue'
          ? order.issueAssignedUserId
          : order.packingAssignedUserId;

      const assignmentTime = stage === 'Issue' ? order.IA_Time : order.PA_Time;

      if (!assignedUserId || !assignmentTime) return;

      const user = await this.prisma.user.findUnique({
        where: { id: assignedUserId },
        select: { name: true },
      });
      if (!user) return;

      // Get MAX and MIN scan timestamps from ERP_Material_Data
      let maxDate: Date | null = null;
      let minDate: Date | null = null;

      if (stage === 'Issue') {
        const agg = await this.prisma.eRP_Material_Data.aggregate({
          where: {
            saleOrderNumber: order.saleOrderNumber,
            FG_OBD: order.outboundDelivery || '',
            IssueUpdatedDate: { not: null },
          },
          _max: { IssueUpdatedDate: true },
          _min: { IssueUpdatedDate: true },
        });
        maxDate = agg._max.IssueUpdatedDate;
        minDate = agg._min.IssueUpdatedDate;
      } else {
        const agg = await this.prisma.eRP_Material_Data.aggregate({
          where: {
            saleOrderNumber: order.saleOrderNumber,
            FG_OBD: order.outboundDelivery || '',
            PackingUpdatedDate: { not: null },
          },
          _max: { PackingUpdatedDate: true },
          _min: { PackingUpdatedDate: true },
        });
        maxDate = agg._max.PackingUpdatedDate;
        minDate = agg._min.PackingUpdatedDate;
      }

      if (!maxDate) return;

      const leadTime = diffMinutes(maxDate, assignmentTime);
      const scanTime = minDate ? diffMinutes(maxDate, minDate) : 0;
      const bin = getBinCategory(order.binCount);

      await this.prisma.efficiency_PP.upsert({
        where: { salesOrderId_stage: { salesOrderId: orderId, stage } },
        update: {
          leadTime,
          scanTime,
          userId: assignedUserId,
          userName: user.name,
          requiredDate: order.deliveryDate,
          bin,
          updatedAt: new Date(),
        },
        create: {
          salesOrderId: orderId,
          saleOrderNumber: order.saleOrderNumber,
          outboundDelivery: order.outboundDelivery || '',
          requiredDate: order.deliveryDate,
          userId: assignedUserId,
          userName: user.name,
          leadTime,
          scanTime,
          bin,
          stage,
        },
      });
    } catch (err) {
      // Log but never break the main stage completion flow
      console.error(
        `[EfficiencyService] recordStageCompletion failed for orderId=${orderId} stage=${stage}:`,
        err,
      );
    }
  }

  async getReport(
    from: Date | null,
    to: Date | null,
    stage: 'Issue' | 'Packing',
  ) {
    return this.prisma.efficiency_PP.findMany({
      where: {
        stage,
        ...(from && to ? { requiredDate: { gte: from, lte: to } } : {}),
      },
      orderBy: [{ requiredDate: 'asc' }, { userName: 'asc' }, { bin: 'asc' }],
    });
  }
}
