import { Module } from '@nestjs/common';
import { LookupController } from './lookup.controller';
import { LookupService } from './lookup.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [LookupController],
  providers: [LookupService, PrismaService],
  exports: [LookupService],
})
export class LookupModule {}
