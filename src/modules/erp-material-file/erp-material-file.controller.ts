import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { Roles } from '../auth/roles.decorator';
import { ErpMaterialFileService } from './erp-material-file.service';
import { CreateErpMaterialFileDto } from './dto/create-erp-material-file.dto';
import { UpdateErpMaterialFileDto } from './dto/update-erp-material-file.dto';
import { QueryErpMaterialFileDto } from './dto/query-erp-material-file.dto';
import { Response } from 'express';
import { SftpService } from '../sftp/sftp.service';

const MAX_UPLOAD_BYTES = Number(
  process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024,
);

function splitExt(name: string) {
  const i = name.lastIndexOf('.');
  if (i <= 0) return { base: name, ext: '' }; 
  return { base: name.slice(0, i), ext: name.slice(i) };
}
function sanitizeBase(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

@ApiTags('erp-material-files')
@ApiBearerAuth()
@Controller({ path: 'v1/erp-material-files', version: '1' })
export class ErpMaterialFileController {
  constructor(
    private readonly service: ErpMaterialFileService,
    private readonly sftp: SftpService,
  ) {}

  @Get()
  @Roles('sales', 'admin')
  @ApiOperation({
    summary: 'List ERP material files with pagination, search & filters',
  })
  async list(@Query() query: QueryErpMaterialFileDto) {
    return this.service.list(query);
  }

  @Get('by-sale-order/:saleOrderNumber')
  @Roles('sales', 'admin')
  @ApiOperation({ summary: 'List files by exact sale order number' })
  @ApiParam({ name: 'saleOrderNumber', type: String })
  async listBySaleOrder(@Param('saleOrderNumber') saleOrderNumber: string) {
    return this.service.listBySaleOrderNumber(saleOrderNumber);
  }

  @Get(':id')
  @Roles('sales', 'admin')
  @ApiOperation({ summary: 'Get a file record by ID' })
  @ApiParam({ name: 'id', type: Number })
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  @Roles('sales', 'admin')
  @ApiOperation({ summary: 'Create a file record (metadata only)' })
  async create(@Body() dto: CreateErpMaterialFileDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('sales', 'admin')
  @ApiOperation({ summary: 'Update a file record' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateErpMaterialFileDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('sales', 'admin')
  @ApiOperation({ summary: 'Delete a file record' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Get(':id/download')
  @Roles('sales', 'admin')
  @ApiOperation({ summary: 'Stream file content (inline if supported)' })
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const row = await this.service.get(id); // has sftpPath, fileName, mimeType, fileSizeBytes
    try {
      const data = await this.sftp.getStream(row.sftpPath);

      res.setHeader('Content-Type', row.mimeType ?? 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(row.fileName)}"`,
      );
      if (row.fileSizeBytes != null) {
        res.setHeader('Content-Length', String(row.fileSizeBytes));
      }

      if (Buffer.isBuffer(data)) return res.end(data);
      (data as NodeJS.ReadableStream).pipe(res);
    } catch {
      res.status(404).send('File not found');
    }
  }

  @Post('upload')
  @Roles('sales', 'admin')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload one or more files to SFTP and create DB rows',
  })
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          const { base, ext } = splitExt(file.originalname);
          const safeBase = sanitizeBase(base);
          const ts = Date.now();
          const id = randomUUID();
          cb(null, `${safeBase}__${ts}_${id}${ext}`);
        },
      }),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('saleOrderNumber') saleOrderNumber?: string,
    @Body('description') description?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files received');
    }

    return this.service.uploadAndCreate(files, {
      saleOrderNumber: saleOrderNumber?.trim() || null,
      description: description?.trim() || null,
    });
  }
}
