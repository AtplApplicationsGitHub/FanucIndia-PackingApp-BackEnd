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

@ApiTags('Sales Order Bulk Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-orders')
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Get('template')
  @Roles('sales')
  @ApiOperation({ summary: 'Download sales order Excel template' })
  @ApiResponse({ status: 200, description: 'Excel file downloaded' })
  async downloadTemplate(@Res() res: Response) {
    await this.salesOrderService.generateBulkTemplate(res);
  }

  @Post('import')
  @Roles('sales')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import bulk sales orders via Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
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
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    return this.salesOrderService.importBulkOrders(
      file.buffer,
      req.user.userId,
    );
  }
}
