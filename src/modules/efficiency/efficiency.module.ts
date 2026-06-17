import { Module } from '@nestjs/common';
import { EfficiencyController } from './efficiency.controller';
import { EfficiencyService } from './efficiency.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [EfficiencyController],
  providers: [EfficiencyService, PrismaService],
  exports: [EfficiencyService],
})
export class EfficiencyModule {}