import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma.module';
import { FreeStockController } from './free-stock.controller';
import { FreeStockService } from './free-stock.service';
import { FreeStockUploadInterceptor } from './free-stock-upload.interceptor';

@Module({
  imports: [PrismaModule],
  controllers: [FreeStockController],
  providers: [FreeStockService, FreeStockUploadInterceptor],
})
export class FreeStockModule {}
