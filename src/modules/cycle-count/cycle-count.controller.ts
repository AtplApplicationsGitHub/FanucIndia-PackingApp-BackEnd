import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { CycleCountActor, CycleCountService } from './cycle-count.service';
import { CreateCycleCountDto, PreviewCycleCountPlanDto } from './dto/plan-cycle-count.dto';
import { QueryCycleCountDto } from './dto/query-cycle-count.dto';
import { CYCLE_COUNT_MAX_FILE_BYTES } from './cycle-count.constants';

/**
 * Cycle Count - WEB (admin) APIs, Phase A: create the audit.
 * Order of use: upload stock (A1/A3) -> plan preview (A2/A4, repeat as needed) -> release (A5).
 * Static routes are declared before ":id" so they are not taken as an id.
 */
@ApiTags('Cycle Count')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('cycle-count')
export class CycleCountController {
  constructor(private readonly cycleCountService: CycleCountService) {}

  // ---------------------------------------------------------------- A1 + A3

  @Post('stock-uploads')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CYCLE_COUNT_MAX_FILE_BYTES, files: 1 } }))
  @ApiOperation({
    summary: 'Upload the SAP LX03 stock file: rows are validated, zero-stock / invalid rows are excluded (not rejected)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '.xlsx or .csv, max 10 MB. Required columns: StorageBin, Material, Avail. Optional: Cert. No., Batch, Plnt, Location, CNC, Class',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Upload summary with excluded rows' })
  @ApiResponse({ status: 400, description: 'No file / wrong type / missing columns / no valid rows' })
  @ApiResponse({ status: 413, description: 'File larger than 10 MB' })
  uploadStock(@UploadedFile() file: Express.Multer.File, @Req() req: AuthRequest) {
    return this.cycleCountService.uploadStock(file, this.actor(req));
  }

  @Get('stock-uploads/:id')
  @ApiOperation({ summary: 'Stock upload summary, excluded rows by reason' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Upload summary' })
  @ApiResponse({ status: 404, description: 'Upload not found' })
  getStockUpload(@Param('id', ParseIntPipe) id: number) {
    return this.cycleCountService.getStockUpload(id);
  }

  // ---------------------------------------------------------------- A2 + A4

  @Post('plan-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Movement analysis for the date range (live + archived DIMS transfer orders) and the planned locations. Nothing is saved.',
  })
  @ApiResponse({ status: 200, description: 'Movement totals, candidates (MANUAL) and plan' })
  @ApiResponse({ status: 400, description: 'Invalid criteria / date range / unknown locations' })
  @ApiResponse({ status: 404, description: 'Stock upload not found' })
  previewPlan(@Body() dto: PreviewCycleCountPlanDto) {
    return this.cycleCountService.previewPlan(dto);
  }

  // ---------------------------------------------------------------- A5

  @Post()
  @ApiOperation({ summary: 'Release the previewed plan: one ASSIGNED audit per operator (locations shared between them)' })
  @ApiResponse({ status: 201, description: 'Audit(s) created' })
  @ApiResponse({ status: 400, description: 'Invalid operators / locations no longer match the criteria' })
  @ApiResponse({ status: 404, description: 'Stock upload not found' })
  create(@Body() dto: CreateCycleCountDto, @Req() req: AuthRequest) {
    return this.cycleCountService.createAudits(dto, this.actor(req));
  }

  @Get('operators')
  @ApiOperation({ summary: 'Operator dropdown: users with USER role' })
  @ApiResponse({ status: 200, description: 'List of operators' })
  getOperators() {
    return this.cycleCountService.getOperators();
  }

  @Get()
  @ApiOperation({ summary: 'Cycle Count audit list with search, status, created date range and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list' })
  findAll(@Query() query: QueryCycleCountDto) {
    return this.cycleCountService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Cycle Count audit detail with locations and expected stock lines' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit detail' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cycleCountService.findOne(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a Cycle Count audit (only while ASSIGNED)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit cancelled' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  @ApiResponse({ status: 409, description: 'Audit is not in ASSIGNED status' })
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.cycleCountService.cancel(id, this.actor(req));
  }

  private actor(req: AuthRequest): CycleCountActor {
    return { userId: Number(req.user.userId), name: req.user.name };
  }
}
