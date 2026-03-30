import { Module } from '@nestjs/common';
import { ArchivedDataService } from './archived-data.service';
import { ArchivedDataController } from './archived-data.controller';
import { PrismaModule } from '../../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ArchivedDataController],
  providers: [ArchivedDataService],
})
export class ArchivedDataModule {}