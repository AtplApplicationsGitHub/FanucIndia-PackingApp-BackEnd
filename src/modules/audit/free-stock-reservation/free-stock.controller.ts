import {
  BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post,
  Query, Req, StreamableFile, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { basename } from 'path';
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/types/auth-request.type';
import { decodeUploadFileName } from '../shared/audit-excel.util';
import { ConfirmBulkFreeStockDto, ConfirmSelectedFreeStockDto, FreeStockPageDto, FreeStockQueryDto, ReleaseFreeStockDto, ReserveFreeStockDto, StockSnapshotDto } from './free-stock.dto';
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
      + 'Filter by reservation owner zoneId and reservedDays (ALL, 0_30, 31_90, OVER_90). '
      + 'Summaries follow search, zoneId, reservedDays and mine, across all pages, independently of selected status. '
      + 'filterOptions.zones contains Sales Zone options independent of the selected filters. '
      + 'For SALES, myReservations contains count and stockQty for the logged-in user’s active RESERVED rows; '
      + 'it follows search/zone/age independently of status/mine and is null for ADMIN. '
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
  @ApiOperation({ summary: 'Preview valid SAP rows, show invalid-row identities/columns/reasons, and estimate updates, protected rows and closures without saving' })
  previewStock(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: AuthRequest) {
    return this.service.previewStock(this.file(file).path, Number(req.user.userId));
  }

  @Post('stock-uploads')
  @Roles('ADMIN')
  @UseInterceptors(FreeStockUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: {
    ...FILE_BODY, required: ['file', 'confirmFullSnapshot', 'previewToken'],
    properties: { ...FILE_BODY.properties, confirmFullSnapshot: { type: 'string', enum: ['true'] }, previewToken: { type: 'string' }, skipInvalidRows: { type: 'string', enum: ['true', 'false'] } },
  } })
  @ApiOperation({ summary: 'Import the reviewed SAP file atomically. skipInvalidRows=true explicitly skips invalid rows and protects matching existing stock; only genuinely absent rows close.' })
  uploadStock(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: StockSnapshotDto, @Req() req: AuthRequest) {
    const uploaded = this.file(file);
    if (dto.confirmFullSnapshot !== 'true') throw new BadRequestException('A complete stock snapshot must be confirmed.');
    return this.service.uploadStock(uploaded.path, this.name(uploaded), Number(req.user.userId), { skipInvalidRows: dto.skipInvalidRows === 'true', previewToken: dto.previewToken });
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
  @ApiOperation({ summary: 'Download reservation Excel: Storage Bin, Material, Batch, Qty and optional SO Number' })
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
  @ApiOperation({ summary: 'Reserve selected Storage Bin-Material-Batch rows atomically; owner and zone are obtained from login' })
  reserve(@Body() dto: ReserveFreeStockDto, @Req() req: AuthRequest) {
    return this.service.reserve(dto, Number(req.user.userId));
  }

  @Post('reservations/selected/preview')
  @HttpCode(HttpStatus.OK)
  @Roles('SALES')
  @ApiOperation({ summary: 'Preview selected rows without saving: full, partial and unavailable allocations by exact Storage Bin+Material+Batch' })
  previewSelected(@Body() dto: ReserveFreeStockDto, @Req() req: AuthRequest) {
    return this.service.previewSelectedReservation(dto, Number(req.user.userId));
  }

  @Post('reservations/selected/confirm')
  @Roles('SALES')
  @ApiOperation({ summary: 'Confirm selected-row partial allocations after rechecking the signed preview; pending quantities are not reserved' })
  confirmSelected(@Body() dto: ConfirmSelectedFreeStockDto, @Req() req: AuthRequest) {
    return this.service.confirmSelectedReservation(dto, Number(req.user.userId));
  }

  @Post('reservations/bulk/preview')
  @HttpCode(HttpStatus.OK)
  @Roles('SALES')
  @UseInterceptors(FreeStockUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_BODY })
  @ApiOperation({ summary: 'Preview exact Storage Bin+Material+Batch allocations, including partial and unavailable rows; saves nothing' })
  previewBulk(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: AuthRequest) {
    const uploaded = this.file(file);
    return this.service.previewBulkReservation(uploaded.path, Number(req.user.userId), this.name(uploaded));
  }

  @Post('reservations/bulk/confirm')
  @Roles('SALES')
  @UseInterceptors(FreeStockUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: {
    ...FILE_BODY, required: ['file', 'previewToken'],
    properties: { ...FILE_BODY.properties, previewToken: { type: 'string' } },
  } })
  @ApiOperation({ summary: 'Confirm the signed bulk preview after checking availability again; reserves allocated quantities only' })
  confirmBulk(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: ConfirmBulkFreeStockDto, @Req() req: AuthRequest) {
    const uploaded = this.file(file);
    return this.service.confirmBulkReservation(uploaded.path, dto.previewToken, Number(req.user.userId), this.name(uploaded));
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
