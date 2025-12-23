import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SoNotificationsService } from '../so-notifications/so-notifications.service';

@Injectable()
export class SoChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly soNotificationsService: SoNotificationsService,
  ) {}

  private async getSalesOrderOrThrow(soNumber: string) {
    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: { saleOrderNumber: { equals: soNumber, mode: 'insensitive' } },
      select: { id: true, userId: true, saleOrderNumber: true, assignedUserId: true },
    });
    if (!salesOrder) throw new NotFoundException('Sales order not found.');
    return salesOrder;
  }

  private enforceSoAccess(
    user: { userId: number; role: string },
    so: { userId: number; assignedUserId: number | null },
  ) {
    if (user.role === 'SALES' && user.userId !== so.userId) {
      throw new ForbiddenException('You are not authorized for this order.');
    }
    if (user.role === 'USER' && user.userId !== so.assignedUserId) {
      throw new ForbiddenException('You are not authorized for this order (Not Assigned).');
    }
  }

  async getMentionUsers(soNumber: string, user: { userId: number; role: string }) {
    const so = await this.getSalesOrderOrThrow(soNumber);

    this.enforceSoAccess(user, so);

    if (user.role === 'ADMIN') {
      const targetIds = [so.userId, so.assignedUserId].filter((id) => id !== null) as number[];

      return this.prisma.user.findMany({
        where: {
          id: { in: targetIds }
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      });
    } else {
      return this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      });
    }
  }

  async listMessages(soNumber: string, user: { userId: number; role: string }) {
    const so = await this.getSalesOrderOrThrow(soNumber);

    this.enforceSoAccess(user, so);

    const where =
      user.role === 'ADMIN'
        ? { salesOrderId: so.id }
        : {
            salesOrderId: so.id,
          };

    return this.prisma.salesOrderChatMessage.findMany({
      where: { salesOrderId: so.id },
      orderBy: { createdAt: 'asc' },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async sendMessage(
    soNumber: string,
    user: { userId: number; role: string },
    body: { toUserId: number; message: string },
  ) {
    const so = await this.getSalesOrderOrThrow(soNumber);
    this.enforceSoAccess(user, so);

    const message = (body.message || '').trim();
    if (!message) throw new ForbiddenException('Message cannot be empty.');
    if (!body.toUserId)
      throw new ForbiddenException('Tagged user is required.');

    const toUser = await this.prisma.user.findUnique({
      where: { id: Number(body.toUserId) },
      select: { id: true, role: true, name: true },
    });
    if (!toUser) throw new NotFoundException('Tagged user not found.');

    if (user.role !== 'ADMIN' && toUser.role !== 'ADMIN') {
      throw new ForbiddenException('You can only message ADMIN.');
    }

    const createdMessage = await this.prisma.salesOrderChatMessage.create({
      data: {
        salesOrderId: so.id,
        fromUserId: user.userId,
        toUserId: toUser.id,
        message,
      },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });

    await this.soNotificationsService.createAndEmit({
      toUserId: toUser.id,
      salesOrderId: so.id,
      messageId: createdMessage.id,
      fromUsername: createdMessage.fromUser.name,
      saleOrderNumber: so.saleOrderNumber,
    });

    return createdMessage;
  }
}
