import { Module } from '@nestjs/common';
import { VehicleEntryController } from './vehicle-entry.controller';
import { VehicleEntryService } from './vehicle-entry.service';
import { PrismaModule } from '../../prisma.module';
import { SftpModule } from '../sftp/sftp.module';

@Module({
  imports: [PrismaModule, SftpModule],
  controllers: [VehicleEntryController],
  providers: [VehicleEntryService],
})
export class VehicleEntryModule {}