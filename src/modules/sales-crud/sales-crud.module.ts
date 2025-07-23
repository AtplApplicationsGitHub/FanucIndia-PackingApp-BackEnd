import { Module } from '@nestjs/common';
import { SalesCrudController } from './sales-crud.controller';
import { SalesCrudService } from './sales-crud.service';

@Module({
  controllers: [SalesCrudController],
  providers: [SalesCrudService],
  exports: [SalesCrudService],
})
export class SalesCrudModule {}
