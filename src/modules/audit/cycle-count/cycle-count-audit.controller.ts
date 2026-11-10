import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/types/auth-request.type';
import { BOM_AUDIT_MAX_FILE_BYTES } from '../bom-completeness/bom-audit.constants';
import { QueryBomAuditDto } from '../bom-completeness/dto/query-bom-audit.dto';
import { CycleCountAuditService } from './cycle-count-audit.service';
import { CreateCycleCountAuditDto, PreviewCycleCountAuditDto } from './dto/create-cycle-count-audit.dto';

const uploadFields = {
  file: { type: 'string', format: 'binary', description: 'Same file format, column configuration and validation as BOM audit (.xlsx/.csv, 10 MB, 20,000 data rows).' },
  fromDate: { type: 'string', example: '2026-10-02', description: 'Inclusive Issue Updated Date from, IST (YYYY-MM-DD).' },
  toDate: { type: 'string', example: '2026-11-02', description: 'Inclusive Issue Updated Date to, IST; at most one calendar month after fromDate.' },
};

@ApiTags('Cycle Count Audit - Creation')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('cycle-count-audit')
export class CycleCountAuditController {
  constructor(private readonly service: CycleCountAuditService) {}

  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: BOM_AUDIT_MAX_FILE_BYTES, files: 1 } }))
  @ApiOperation({ summary: 'Preview matching bins without saving', description: 'Identify SOs by Issue Updated Date in primary/archive data, keep binCount > 1, collect all their bins and intersect with Excel storage bins only. Materials and expected quantities come from the Excel. Returns only matching locations and selection counts.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file', 'fromDate', 'toDate'], properties: uploadFields } })
  preview(@UploadedFile() file: Express.Multer.File, @Body() dto: PreviewCycleCountAuditDto) {
    return this.service.previewAudit(file, dto);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: BOM_AUDIT_MAX_FILE_BYTES, files: 1 } }))
  @ApiOperation({ summary: 'Create ASSIGNED Cycle Count audits, one per operator', description: 'Rechecks the Excel and current ERP intersection at creation. Operator ID is optional in Excel. binOperators fills missing assignments or overrides Excel assignments for matching bins. Every matching bin needs a valid USER operator. All audits are saved atomically.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file', 'auditName', 'fromDate', 'toDate'], properties: {
    ...uploadFields,
    auditName: { type: 'string', maxLength: 255, example: 'Cycle Count - October' },
    binOperators: { type: 'string', description: 'Optional JSON assignments for matched bins only.', example: '[{"storageBin":"B4","operatorId":12}]' },
  } } })
  create(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateCycleCountAuditDto, @Req() req: AuthRequest) {
    return this.service.createAudit(file, dto, { userId: Number(req.user.userId), name: req.user.name });
  }

  @Get()
  @ApiOperation({ summary: 'List created Cycle Count audits', description: 'fromDate/toDate here filter audit creation dates, not Issue Updated Date.' })
  list(@Query() query: QueryBomAuditDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Inspect a created audit, matching bins and expected materials' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
