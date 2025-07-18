import {
  Controller,
  Get,
  Post,
  Res,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { SalesOrderService } from './sales-order.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Sales Order Bulk Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Get('template')
  @Roles('sales')
  async downloadTemplate(@Res() res: Response) {
    await this.salesOrderService.generateBulkTemplate(res);
  }

  @Post('import')
  @Roles('sales')
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(@UploadedFile() file: any, @Req() req: any) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    return this.salesOrderService.importBulkOrders(
      file.buffer,
      req.user['userId'],
    );
  }
}
