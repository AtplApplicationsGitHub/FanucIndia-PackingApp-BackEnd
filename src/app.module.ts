import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SalesOrderModule } from './modules/sales-order/sales-order.module';
import { AuthModule } from './modules/auth/auth.module';
import { LookupModule } from './modules/lookup/lookup.module';
import { SalesCrudModule } from './modules/sales-crud/sales-crud.module';
import { AdminOrderModule } from './modules/admin-order/admin-order.module';
import { PrismaModule } from './prisma.module';
import { UserModule } from './modules/user/user.module';
import { ErpMaterialDataModule } from './modules/erp-material-data/erp-material-data.module';

@Module({
  imports: [PrismaModule, SalesOrderModule, AuthModule, LookupModule, SalesCrudModule, AdminOrderModule, UserModule, ErpMaterialDataModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
