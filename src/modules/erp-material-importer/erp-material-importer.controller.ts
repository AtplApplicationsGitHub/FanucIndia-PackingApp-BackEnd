import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ErpMaterialImporterService } from './erp-material-importer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
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
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('saleOrderNumber') saleOrderNumber?: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    return this.service.processFile(file, saleOrderNumber);
  }
}