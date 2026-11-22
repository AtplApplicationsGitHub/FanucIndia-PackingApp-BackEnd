import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma.module';
import { FreeStockController } from './free-stock.controller';
import { FreeStockService } from './free-stock.service';
import { FreeStockColumnConfigService } from './free-stock-column-config.service';
import { FreeStockArchiveService } from './free-stock-archive.service';
import { FreeStockUploadInterceptor } from './free-stock-upload.interceptor';

import { FreeStockPreviewActivityService } from './free-stock-preview-activity.service';

@Module({
  imports: [PrismaModule],
  controllers: [FreeStockController],
  providers: [
    FreeStockService,
    FreeStockUploadInterceptor,
    FreeStockColumnConfigService,
    FreeStockArchiveService,
    FreeStockPreviewActivityService,
  ],
})
export class FreeStockModule {}
