import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma.module';
import { LocationMasterController } from './location-master.controller';
import { LocationMasterService } from './location-master.service';

@Module({
  imports: [PrismaModule],
  controllers: [LocationMasterController],
  providers: [LocationMasterService],
})
export class LocationMasterModule {}
