import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Body,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ErpMaterialImporterService } from './erp-material-importer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { BulkImportDriveDto } from './dto/bulk-import-drive.dto';
import { AuthRequest } from '../auth/types/auth-request.type';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('ERP Material Importer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('erp-material-importer')
export class ErpMaterialImporterController {
  constructor(private readonly service: ErpMaterialImporterService) {}

  @Post('upload')
  @Roles('ADMIN','USER')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and process an ERP material file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        saleOrderNumber: {
          type: 'string',
          description: 'The expected Sale Order Number to validate against the file content.',
          nullable: true,
        }
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File, 
    @Req() req: AuthRequest,
    @Body('saleOrderNumber') saleOrderNumber?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    return this.service.processFile(file, saleOrderNumber, req.user.name);
  }

  @Post('bulk-import-from-drive')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Bulk import ERP material files from drive for multiple SOs' })
  @ApiBody({ type: BulkImportDriveDto })
  async bulkImportFromDrive(@Body() dto: BulkImportDriveDto, @Req() req: AuthRequest) {
    if (!dto.saleOrderNumbers || dto.saleOrderNumbers.length === 0) {
      throw new BadRequestException('Sale Order Numbers list is required.');
    }
    return this.service.bulkImportFromDrive(dto.saleOrderNumbers, req.user.name);
  }

  @Post('import-from-drive')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Import ERP material file automatically from configured drive' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        saleOrderNumber: {
          type: 'string',
          description: 'The Sale Order Number to fetch the file for.',
        },
      },
      required: ['saleOrderNumber'],
    },
  })
  async importFromDrive(@Body('saleOrderNumber') saleOrderNumber: string, @Req() req: AuthRequest) {
    if (!saleOrderNumber) {
      throw new BadRequestException('Sale Order Number is required.');
    }
    return this.service.importFromDrive(saleOrderNumber, req.user.name);
  }
}