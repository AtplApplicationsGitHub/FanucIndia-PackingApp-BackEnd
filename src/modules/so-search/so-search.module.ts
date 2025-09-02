import { Module } from '@nestjs/common';
import { SoSearchController } from './so-search.controller';
import { SoSearchService } from './so-search.service';

@Module({
  controllers: [SoSearchController],
  providers: [SoSearchService],
})
export class SoSearchModule {}