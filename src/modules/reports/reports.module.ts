import { Module } from '@nestjs/common';
import { ReportsSalesOrderController } from './reports.controller';
import { ReportsSalesOrderService } from './reports.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ReportsSalesOrderController],
  providers: [ReportsSalesOrderService, PrismaService],
})
export class ReportsModule {}
