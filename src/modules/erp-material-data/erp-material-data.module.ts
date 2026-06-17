import { Module } from '@nestjs/common';
import { ErpMaterialDataService } from './erp-material-data.service';
import { ErpMaterialDataController } from './erp-material-data.controller';
import { PrismaService } from '../../prisma.service';
import { EfficiencyModule } from '../efficiency/efficiency.module';

@Module({
  imports: [EfficiencyModule],
  controllers: [ErpMaterialDataController],
  providers: [ErpMaterialDataService, PrismaService],
  exports: [ErpMaterialDataService],
})
export class ErpMaterialDataModule {}