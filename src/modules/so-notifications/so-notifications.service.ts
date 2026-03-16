import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SoNotificationsGateway } from './so-notifications.gateway';

@Injectable()
export class SoNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: SoNotificationsGateway,
  ) {}

  async list(user: { userId: number }) {
    return this.prisma.soChatNotification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          include: {
            fromUser: { select: { id: true, name: true } },
          },
        },
        salesOrder: { select: { id: true, saleOrderNumber: true } },
      },
    });
  }

  async delete(notificationId: number, user: { userId: number }) {
    const n = await this.prisma.soChatNotification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });
    if (!n) throw new NotFoundException('Notification not found');
    if (n.userId !== user.userId) throw new ForbiddenException('Not allowed');

    await this.prisma.soChatNotification.delete({ where: { id: notificationId } });
    return { ok: true };
  }

  async createAndEmit(args: {
    toUserId: number;
    salesOrderId: number;
    messageId: number;
    fromUsername: string;
    saleOrderNumber: string;
  }) {
    const created = await this.prisma.soChatNotification.create({
      data: {
        userId: args.toUserId,
        salesOrderId: args.salesOrderId,
        messageId: args.messageId,
      },
    });

    this.gateway.emitToUser(args.toUserId, {
      id: created.id,
      createdAt: created.createdAt,
      salesOrderNumber: args.saleOrderNumber,
      fromUsername: args.fromUsername,
      messageId: args.messageId,
    });

    return created;
  }

  async clearForOrder(orderId: number, userId: number) {
    const so = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: { saleOrderNumber: true }
    });
    
    if (!so) return { ok: false };

    await this.prisma.soChatNotification.deleteMany({
      where: {
        salesOrderId: orderId, 
        userId: userId,
      },
    });

    this.gateway.emitClearToUser(userId, so.saleOrderNumber);

    return { ok: true };
  }
}
