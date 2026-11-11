import {
  BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post,
  Query, Req, StreamableFile, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { basename } from 'path';
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/types/auth-request.type';
import { decodeUploadFileName } from '../shared/audit-excel.util';
import { FreeStockPageDto, FreeStockQueryDto, ReleaseFreeStockDto, ReserveFreeStockDto, StockSnapshotDto } from './free-stock.dto';
import { FreeStockService } from './free-stock.service';
import { FreeStockUploadInterceptor } from './free-stock-upload.interceptor';

const FILE_BODY = {
  type: 'object', required: ['file'],
  properties: { file: { type: 'string', format: 'binary' } },
};

@ApiTags('Free Stock - Reservations')
@ApiBearerAuth()
@Roles('ADMIN', 'SALES')
@Controller('free-stock')
export class FreeStockController {
  constructor(private readonly service: FreeStockService) {}

  @Get('stocks')
  @ApiOperation({
    summary: 'Stock with status counts, stock totals and My Reservations summary',
    description: 'statusCounts retains the existing OPEN/RESERVED/CLOSED row counts. '
      + 'statusSummary contains ALL/OPEN/RESERVED/CLOSED, each with count and stockQty (the exact Stock sum as a decimal string). '
      + 'Summaries follow search and mine, across all pages, independently of the selected status. '
      + 'For SALES, myReservations contains count and stockQty for the logged-in user’s active RESERVED rows; '
      + 'it follows search independently of status/mine and is null for ADMIN. '
      + 'Use mine=true&status=RESERVED to list the My Reservations card’s rows.',
  })
  list(@Query() query: FreeStockQueryDto, @Req() req: AuthRequest) {
    return this.service.list(query, Number(req.user.userId));
  }

  @Get('stocks/:id')
  @ApiOperation({ summary: 'One current or historical stock occurrence' })
  detail(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.detail(id, Number(req.user.userId));
  }

  @Get('stocks/:id/history')
  @ApiOperation({ summary: 'Reservation history: ADMIN sees all, SALES sees their own history' })
  history(@Param('id', ParseIntPipe) id: number, @Query() query: FreeStockPageDto, @Req() req: AuthRequest) {
    return this.service.history(id, query, Number(req.user.userId));
  }

  @Post('stock-uploads/preview')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  @UseInterceptors(FreeStockUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_BODY })
  @ApiOperation({ summary: 'Validate SAP Sheet1 A-N and estimate inserts, updates and closures without saving' })
  previewStock(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: AuthRequest) {
    return this.service.previewStock(this.file(file).path, Number(req.user.userId));
  }

  @Post('stock-uploads')
  @Roles('ADMIN')
  @UseInterceptors(FreeStockUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: {
    ...FILE_BODY, required: ['file', 'confirmFullSnapshot'],
    properties: { ...FILE_BODY.properties, confirmFullSnapshot: { type: 'string', enum: ['true'] } },
  } })
  @ApiOperation({ summary: 'Import the complete SAP snapshot atomically; absent stock becomes CLOSED. No 10 MB application limit.' })
  uploadStock(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: StockSnapshotDto, @Req() req: AuthRequest) {
    const uploaded = this.file(file);
    if (dto.confirmFullSnapshot !== 'true') throw new BadRequestException('A complete stock snapshot must be confirmed.');
    return this.service.uploadStock(uploaded.path, this.name(uploaded), Number(req.user.userId));
  }

  @Get('stock-uploads')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'SAP upload history and processing results' })
  uploads(@Query() query: FreeStockPageDto, @Req() req: AuthRequest) {
    return this.service.uploads(query, Number(req.user.userId));
  }

  @Get('stock-uploads/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'SAP upload processing result' })
  uploadDetail(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.service.uploadDetail(id, Number(req.user.userId));
  }

  @Get('reservations/template')
  @ApiOperation({ summary: 'Download reservation Excel: Material, Batch, Qty and optional SO Number' })
  async template(@Req() req: AuthRequest) {
    const buffer = await this.service.template(Number(req.user.userId));
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="Free_Stock_Reservation_Template.xlsx"', length: buffer.length,
    });
  }

  @Post('reservations/preview')
  @HttpCode(HttpStatus.OK)
  @Roles('SALES')
  @UseInterceptors(FreeStockUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_BODY })
  @ApiOperation({ summary: 'Validate every requested reservation row without reserving stock' })
  previewReservation(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: AuthRequest) {
    const uploaded = this.file(file);
    return this.service.reservationFile(uploaded.path, Number(req.user.userId), false, this.name(uploaded));
  }

  @Post('reservations/upload')
  @Roles('SALES')
  @UseInterceptors(FreeStockUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_BODY })
  @ApiOperation({ summary: 'Reserve all Excel rows in the logged-in SALES name, or reject the whole request' })
  uploadReservation(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: AuthRequest) {
    const uploaded = this.file(file);
    return this.service.reservationFile(uploaded.path, Number(req.user.userId), true, this.name(uploaded));
  }

  @Post('reservations')
  @Roles('SALES')
  @ApiOperation({ summary: 'Reserve selected Material-Batch rows atomically; owner and zone are obtained from login' })
  reserve(@Body() dto: ReserveFreeStockDto, @Req() req: AuthRequest) {
    return this.service.reserve(dto, Number(req.user.userId));
  }

  @Post('reservations/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release all selected active reservations: own rows for SALES, any rows for ADMIN' })
  release(@Body() dto: ReleaseFreeStockDto, @Req() req: AuthRequest) {
    return this.service.release(dto.stockItemIds, Number(req.user.userId));
  }

  private file(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file?.path || !file.size) throw new BadRequestException('A non-empty .xlsx file is required.');
    return file;
  }

  private name(file: Express.Multer.File): string {
    return basename(decodeUploadFileName(file.originalname));
  }
}
