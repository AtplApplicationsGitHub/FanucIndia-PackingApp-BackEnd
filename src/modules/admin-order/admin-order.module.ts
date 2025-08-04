import { Module } from '@nestjs/common';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';
import { AdminSalesOrdersController } from './admin-sales-orders.controller';

@Module({
  controllers: [AdminOrderController, AdminSalesOrdersController],
  providers: [AdminOrderService],
  exports: [AdminOrderService],
})
export class AdminOrderModule {}
