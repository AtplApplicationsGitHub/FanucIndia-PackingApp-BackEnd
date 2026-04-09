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

  private async getSalesOrderOrThrow(orderId: number) {
    const salesOrder = await this.prisma.salesOrder.findUnique({
      where: { id: orderId }, 
      select: { 
        id: true, 
        userId: true, 
        saleOrderNumber: true, 
        assignedUserId: true, 
        issueAssignedUserId: true, 
        packingAssignedUserId: true, 
        salesZoneId: true 
      },
    });
    if (!salesOrder) throw new NotFoundException('Sales order not found.');
    return salesOrder;
  }

  private enforceSoAccess(
    user: { userId: number; role: string; salesZoneId?: number }, 
    so: { 
      userId: number; 
      assignedUserId: number | null; 
      issueAssignedUserId: number | null;
      packingAssignedUserId: number | null;
      salesZoneId?: number 
    }, 
  ) {
    if (user.role === 'SALES') {
      const isCreator = user.userId === so.userId;
      
      const isSameZone = 
        user.salesZoneId && 
        so.salesZoneId && 
        user.salesZoneId === so.salesZoneId;

      if (!isCreator && !isSameZone) {
        throw new ForbiddenException('You are not authorized for this order.');
      }
    }
    
    if (
      user.role === 'USER' && 
      user.userId !== so.assignedUserId &&
      user.userId !== so.issueAssignedUserId &&
      user.userId !== so.packingAssignedUserId
    ) {
      throw new ForbiddenException('You are not authorized for this order (Not Assigned).');
    }
  }

  async getMentionUsers(orderId: number, user: { userId: number; role: string; salesZoneId?: number }) {
    const so = await this.getSalesOrderOrThrow(orderId);

    this.enforceSoAccess(user, so);

    if (user.role === 'ADMIN') {
      const targetIds = [
        so.userId, 
        so.assignedUserId, 
        so.issueAssignedUserId, 
        so.packingAssignedUserId
      ].filter((id) => id !== null) as number[];

      return this.prisma.user.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, name: true, role: true, email: true },
        orderBy: { name: 'asc' },
      });
    } else {
      return this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, role: true, email: true },
        orderBy: { name: 'asc' },
      });
    }
  }

  async listMessages(orderId: number, user: { userId: number; role: string; salesZoneId?: number }) {
    const so = await this.getSalesOrderOrThrow(orderId);

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
        fromUser: { select: { id: true, name: true, role: true, email: true } },
        toUser: { select: { id: true, name: true, role: true, email: true } },
      },
    });
  }

  async sendMessage(
    orderId: number,
    user: { userId: number; role: string; salesZoneId?: number },
    body: { toUserId: number; message: string },
  ) {
    const so = await this.getSalesOrderOrThrow(orderId);
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
        fromUser: { select: { id: true, name: true, role: true, email: true } },
        toUser: { select: { id: true, name: true, role: true, email: true } },
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
