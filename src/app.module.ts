import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { ErpMaterialFileModule } from './modules/erp-material-file/erp-material-file.module';
import { SftpModule } from './modules/sftp/sftp.module';
import { UserDashboardModule } from './modules/user-dashboard/user-dashboard.module';
import { ErpMaterialImporterModule } from './modules/erp-material-importer/erp-material-importer.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { SoSearchModule } from './modules/so-search/so-search.module';
import { FgDashboardModule } from './modules/fg-dashboard/fg-dashboard.module';
import { FgStorageModule } from './modules/fg-storage/fg-storage.module';
import { SoArchiveModule } from './modules/so-archive/so-archive.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { VehicleEntryModule } from './modules/vehicle-entry/vehicle-entry.module';
import { SoChatModule } from './modules/so-chat/so-chat.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, SalesOrderModule, AuthModule, LookupModule, SalesCrudModule, AdminOrderModule, UserModule, ErpMaterialDataModule, ErpMaterialFileModule, SftpModule, UserDashboardModule, ErpMaterialImporterModule, DispatchModule, SoSearchModule, FgDashboardModule, FgStorageModule, SoArchiveModule, DashboardModule, VehicleEntryModule, SoChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
