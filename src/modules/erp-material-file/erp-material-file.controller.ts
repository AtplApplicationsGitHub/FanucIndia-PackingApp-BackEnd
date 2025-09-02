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
  Req,
  UseGuards,
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
import { AuthRequest } from '../auth/types/auth-request.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
@UseGuards(JwtAuthGuard)
@Controller({ path: 'v1/erp-material-files', version: '1' })
export class ErpMaterialFileController {
  constructor(
    private readonly service: ErpMaterialFileService,
    private readonly sftp: SftpService,
  ) {}

  @Get()
  @Roles('SALES', 'ADMIN', 'USER')
  @ApiOperation({
    summary: 'List ERP material files with pagination, search & filters',
  })
  async list(@Query() query: QueryErpMaterialFileDto, @Req() req: AuthRequest) {
    const { userId, role } = req.user;
    return this.service.list(query, userId, role);
  }

  @Get('by-sale-order/:saleOrderNumber')
  @Roles('SALES', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'List files by exact sale order number' })
  @ApiParam({ name: 'saleOrderNumber', type: String })
  async listBySaleOrder(
      @Param('saleOrderNumber') saleOrderNumber: string,
      @Req() req: AuthRequest
    ) {
    const { userId, role } = req.user;
    return this.service.listBySaleOrderNumber(saleOrderNumber, userId, role);
  }

  @Get(':id')
  @Roles('SALES', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Get a file record by ID' })
  @ApiParam({ name: 'id', type: Number })
  async get(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const { userId, role } = req.user;
    return this.service.get(id, userId, role);
  }

  @Post()
  @Roles('SALES', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Create a file record (metadata only)' })
  async create(@Body() dto: CreateErpMaterialFileDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('SALES', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Update a file record' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateErpMaterialFileDto,
    @Req() req: AuthRequest
  ) {
    const { userId, role } = req.user;
    return this.service.update(id, dto, userId, role);
  }

  @Delete(':id')
  @Roles('SALES', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Delete a file record' })
  @ApiParam({ name: 'id', type: Number })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const { userId, role } = req.user;
    return this.service.remove(id, userId, role);
  }

  @Get(':id/download')
  @Roles('SALES', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Stream file content (inline if supported)' })
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Req() req: AuthRequest) {
    const { userId, role } = req.user;
    const row = await this.service.get(id, userId, role);
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
  @Roles('SALES', 'ADMIN', 'USER')
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
    @Req() req?: AuthRequest,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files received');
    }
    
    if (!req?.user) {
        throw new BadRequestException('User information not available');
    }

    const { userId, role } = req.user;

    return this.service.uploadAndCreate(files, {
      saleOrderNumber: saleOrderNumber?.trim() || null,
      description: description?.trim() || null,
    }, userId, role);
  }
}