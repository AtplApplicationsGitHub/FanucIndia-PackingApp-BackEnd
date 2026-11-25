import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { basename, extname } from 'node:path';
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/types/auth-request.type';
import { decodeUploadFileName } from '../shared/audit-excel.util';
import {
  IbdLanPrintDto,
  IbdPrintQueryDto,
  IbdPrintSelectionDto,
  IbdPrintUploadIdDto,
  IbdPrnPreviewDto,
} from './ibd-print.dto';
import { IBD_PRINT_FIELDS } from './ibd-print.excel';
import { IbdPrintLabelService } from './ibd-print-label.service';
import { IbdPrintService } from './ibd-print.service';

const IbdPrintUpload = FileInterceptor('file', {
  limits: { files: 1 },
  fileFilter: (_request, file, callback) => {
    if (extname(file.originalname).toLowerCase() !== '.xlsx') {
      return callback(new BadRequestException('Only .xlsx files are supported.'), false);
    }
    callback(null, true);
  },
});

@ApiTags('IBD Print')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('ibd-print/uploads')
export class IbdPrintController {
  constructor(
    private readonly service: IbdPrintService,
    private readonly labels: IbdPrintLabelService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List IBD Print uploads',
    description: 'Search by upload ID, filename, or uploader. Returns data and pagination.',
  })
  list(@Query() query: IbdPrintQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @UseInterceptors(IbdPrintUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Import the first worksheet, including incomplete rows',
    description:
      'Row 1 must contain each configured IBD Print header exactly once. ' +
      'Capitalization, spacing, and punctuation must match. Blank data cells are accepted. ' +
      'Invalid headers return 400 with missing, unexpected, and duplicate header details.',
  })
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: AuthRequest) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Upload an .xlsx workbook in the file field.');
    }
    return this.service.upload(
      file.buffer,
      basename(decodeUploadFileName(file.originalname)),
      Number(req.user.userId),
      req.user.name,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'View and search rows from one upload',
    description:
      'Returns upload, data, and pagination. Each row has id, uploadId, rowNumber, ' +
      'and the following nullable text fields: ' + IBD_PRINT_FIELDS.join(', ') + '.',
  })
  detail(@Param() { id }: IbdPrintUploadIdDto, @Query() query: IbdPrintQueryDto) {
    return this.service.detail(id, query);
  }

  @Post(':id/print-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Return selected rows or the entire upload for printing',
    description:
      'Send one or more row IDs in rowIds. An empty selection returns all rows in Excel order. ' +
      'This endpoint returns data only.',
  })
  printData(@Param() { id }: IbdPrintUploadIdDto, @Body() selection: IbdPrintSelectionDto) {
    return this.service.printData(id, selection?.rowIds);
  }

  @Post(':id/prn-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate the ZPL PRN for Swagger preview',
    description:
      'Returns the rendered ZPL in prn. No printer connection is made. ' +
      'Omit rowIds or send [] for all rows. Quantity defaults to one copy per row.',
  })
  prnPreview(@Param() { id }: IbdPrintUploadIdDto, @Body() dto: IbdPrnPreviewDto) {
    return this.labels.preview(id, dto);
  }

  @Post(':id/print')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send IBD labels to a LAN printer',
    description:
      'Send a printerId from GET /lookup/printers. The backend sends ZPL to that printer on TCP port 9100. ' +
      'Omit rowIds or send [] for all rows. Quantity defaults to one copy per row.',
  })
  print(@Param() { id }: IbdPrintUploadIdDto, @Body() dto: IbdLanPrintDto) {
    return this.labels.print(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an upload and all its imported rows' })
  async remove(@Param() { id }: IbdPrintUploadIdDto): Promise<void> {
    await this.service.remove(id);
  }
}
