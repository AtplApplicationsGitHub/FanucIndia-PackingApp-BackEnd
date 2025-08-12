import { Module } from '@nestjs/common';
import { SalesCrudController } from './sales-crud.controller';
import { SalesCrudService } from './sales-crud.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SalesCrudController],
  providers: [SalesCrudService, PrismaService],
  exports: [SalesCrudService],
})
export class SalesCrudModule {}
