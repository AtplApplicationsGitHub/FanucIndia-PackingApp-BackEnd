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
  BadRequestException,
  Delete,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { SalesOrderService } from './sales-order.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthRequest } from '../auth/types/auth-request.type';
import { Buffer } from 'buffer';

@ApiTags('Sales Order Bulk Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Get('excel-export')
  async exportExcel(@Req() req, @Query() filters: any, @Res() res: Response) {
    const userId = Number((req as AuthRequest).user.userId);
    if (!Number.isFinite(userId)) {
      throw new BadRequestException('Invalid userId in auth context');
    }
    const buffer = await this.salesOrderService.exportSalesExcel(
      userId,
      filters,
    );

    const date = new Date();
    const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    const filename = `Sales_Orders_Export_${timestamp}.xlsx`;

    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('excel-import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = Number(req.user.userId);
    if (!Number.isFinite(userId)) {
      throw new BadRequestException('Invalid userId in auth context');
    }
    return this.salesOrderService.importSalesExcel(file.buffer, userId);
  }

  @Get('template')
  @Roles('SALES')
  @ApiOperation({ summary: 'Download sales order Excel template' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  @ApiResponse({
    status: 500,
    description: 'Failed to generate or send template',
  })
  async downloadTemplate(@Res() res: Response) {
    try {
      await this.salesOrderService.generateBulkTemplate(res);
    } catch (err: any) {
      const status =
        err instanceof HttpException
          ? err.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        err.message || 'Failed to download template',
        status,
      );
    }
  }

  @Post('import')
  @Roles('SALES')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import bulk sales orders via Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Sales orders imported successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid format',
  })
  @ApiResponse({ status: 409, description: 'Duplicate orders detected' })
  @ApiResponse({ status: 500, description: 'Failed to import sales orders' })
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const buf = Buffer.isBuffer(file.buffer)
      ? file.buffer
      : Buffer.from(file.buffer);

    try {
      return await this.salesOrderService.importBulkOrders(
        buf,
        req.user.userId,
      );
    } catch (err: any) {
      if (err.status && err.response) {
        throw err;
      }
      throw new HttpException(
        err.message || 'Failed to import sales orders',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/reset')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Reset SO: Delete ERP Data and clear Status/Priority/Assignment',
  })
  @ApiResponse({ status: 200, description: 'Sales Order reset successfully' })
  async resetSalesOrder(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.salesOrderService.resetSalesOrder(id, req.user.name);
  }
}
