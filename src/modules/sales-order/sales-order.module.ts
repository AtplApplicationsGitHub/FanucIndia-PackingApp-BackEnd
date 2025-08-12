import { Module } from '@nestjs/common';
import { SalesOrderController } from './sales-order.controller';
import { SalesOrderService } from './sales-order.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SalesOrderController],
  providers: [SalesOrderService, PrismaService],
})
export class SalesOrderModule {}
