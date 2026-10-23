import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
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
import { BomAuditActor, BomAuditService } from './bom-audit.service';
import { BomAuditReportService } from './bom-audit-report.service';
import { CreateBomAuditDto } from './dto/create-bom-audit.dto';
import { QueryBomAuditDto } from './dto/query-bom-audit.dto';
import {
  BOM_AUDIT_MAX_FILE_BYTES,
  BOM_AUDIT_TEMPLATE,
} from './bom-audit.constants';

@ApiTags('BOM Audit')
@ApiBearerAuth()
@Controller('bom-audit')
export class BomAuditController {
  constructor(
    private readonly bomAuditService: BomAuditService,
    private readonly bomAuditReportService: BomAuditReportService,
  ) {}

  @Post()
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: BOM_AUDIT_MAX_FILE_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    summary:
      'Create BOM audit(s) from the template: Audit Name cell + Operator per storage bin -> one audit per operator',
    description:
      'Template file (GET /bom-audit/template): the file carries the Audit Name and the Operator of every storage bin; ' +
      'auditName / operatorId are not needed. A plain file without an Operator column still works with auditName + operatorId.',
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
          description:
            '.xlsx or .csv, max 10 MB. Template: Audit Name (row 1) + StorageBin, Material, Avail, Operator columns',
        },
        auditName: {
          type: 'string',
          maxLength: 255,
          example: 'BOM Audit - Rack 12 - Oct Week 2',
          description: 'Only for a file without the Audit Name cell',
        },
        operatorId: {
          type: 'integer',
          example: 12,
          description: 'Only for a file without an Operator column',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Audit(s) created (status ASSIGNED) - one per operator in the file',
  })
  @ApiResponse({
    status: 400,
    description:
      'No file / missing audit name / wrong file type / missing columns / invalid rows (errors[] lists every bad row) / invalid operator',
  })
  @ApiResponse({ status: 413, description: 'File larger than 10 MB' })
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateBomAuditDto,
    @Req() req: AuthRequest,
  ) {
    return this.bomAuditService.createAudit(file, dto, this.actor(req));
  }

  @Get('operators')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Operator dropdown: users with USER role' })
  @ApiResponse({ status: 200, description: 'List of operators' })
  getOperators() {
    return this.bomAuditService.getOperators();
  }

  @Get('template')
  @Roles('ADMIN')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    `attachment; filename="${BOM_AUDIT_TEMPLATE.fileName}"`,
  )
  @ApiOperation({
    summary:
      'Download the BOM audit Excel template (Audit Name cell + Operator dropdown of USER-role operators)',
  })
  @ApiResponse({ status: 200, description: 'Excel file (.xlsx)' })
  async downloadTemplate() {
    return new StreamableFile(await this.bomAuditService.buildTemplate());
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'BOM audit list with search, status, upload date range and pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of BOM audits' })
  findAll(@Query() query: QueryBomAuditDto) {
    return this.bomAuditService.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'BOM audit detail with locations and expected materials',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit detail' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bomAuditService.findOne(id);
  }

  @Get(':id/report')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Download the report Excel of a submitted BOM audit (saved on SFTP; built from the database if it is not there)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Excel file (.xlsx)' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  @ApiResponse({ status: 409, description: 'Audit not submitted yet' })
  async downloadReport(@Param('id', ParseIntPipe) id: number) {
    const report = await this.bomAuditReportService.getReportForDownload(id);
    return new StreamableFile(report.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${report.fileName}"`,
      length: report.buffer.length,
    });
  }

  @Patch(':id/cancel')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Cancel a BOM audit (allowed only while ASSIGNED, before the operator downloads it)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit cancelled' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  @ApiResponse({ status: 409, description: 'Audit is not in ASSIGNED status' })
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.bomAuditService.cancel(id, this.actor(req));
  }

  private actor(req: AuthRequest): BomAuditActor {
    return { userId: Number(req.user.userId), name: req.user.name };
  }
}
