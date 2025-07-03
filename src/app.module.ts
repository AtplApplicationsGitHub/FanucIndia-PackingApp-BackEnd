import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SalesOrderModule } from './modules/sales-order/sales-order.module';
import { AuthModule } from './modules/auth/auth.module';
import { LookupModule } from './modules/lookup/lookup.module';
import { SalesCrudModule } from './modules/sales-crud/sales-crud.module';
import { AdminOrderModule } from './modules/admin-order/admin-order.module';

@Module({
  imports: [SalesOrderModule, AuthModule, LookupModule, SalesCrudModule, AdminOrderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
