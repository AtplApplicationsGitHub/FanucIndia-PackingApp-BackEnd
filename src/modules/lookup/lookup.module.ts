import { Module } from '@nestjs/common';
import { LookupController } from './lookup.controller';
import { LookupService } from './lookup.service';
import { LocationMasterModule } from './location-master/location-master.module';

@Module({
  imports: [LocationMasterModule],
  controllers: [LookupController],
  providers: [LookupService],
  exports: [LookupService],
})
export class LookupModule {}
