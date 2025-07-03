import { Module } from '@nestjs/common';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [AdminOrderController],
  providers: [AdminOrderService, PrismaService],
  exports: [AdminOrderService],
})
export class AdminOrderModule {}
