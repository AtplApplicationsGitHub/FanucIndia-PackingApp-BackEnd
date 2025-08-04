// src/modules/erp-material-data/erp-material-data.module.ts
import { Module } from '@nestjs/common';
import { ErpMaterialDataService } from './erp-material-data.service';
import { ErpMaterialDataController } from './erp-material-data.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ErpMaterialDataController],
  providers: [ErpMaterialDataService, PrismaService],
  exports: [ErpMaterialDataService],
})
export class ErpMaterialDataModule {}
