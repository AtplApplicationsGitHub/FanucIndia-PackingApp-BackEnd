import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/types/auth-request.type';
import { BomAuditActor, BomAuditService } from './bom-audit.service';
import { BomAuditReportService } from './bom-audit-report.service';
import { CreateBomAuditDto, ReassignBomAuditDto } from './dto/create-bom-audit.dto';
import { QueryBomAuditDto } from './dto/query-bom-audit.dto';

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
      limits: { files: 1, fieldSize: Infinity },
    }),
  )
  @ApiOperation({
    summary:
      'Create BOM audit(s): Audit Name (typed on the screen) + Excel; operator per storage bin from the file and/or chosen on the screen -> one audit per operator',
    description:
      'No template: the admin uploads their own Excel with the columns StorageBin, Material, Qty (or Avail) and optionally Operator ' +
      '(the User ID of a Terminal Operator, role USER) - in any order. Bins without an Operator in the file get the operator chosen ' +
      'on the screen (binOperators), which also replaces the file Operator for the bins listed. Every storage bin must end up with an operator. ' +
      'Every row is checked; all problems are returned in errors[] with the Excel row number. Operator IDs that do not exist or are not role USER are rejected.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'auditName'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '.xlsx or .csv; no application file-size or row-count limit. Columns: StorageBin, Material, Qty (or Avail), Operator (Operator ID, optional)',
        },
        auditName: {
          type: 'string',
          maxLength: 255,
          example: 'BOM Audit - Rack 12 - Oct Week 2',
          description: 'Audit Name typed on the screen',
        },
        binOperators: {
          type: 'string',
          example: '[{"storageBin":"15-C-22","operatorId":12}]',
          description: 'Optional JSON list of operators chosen on the screen per storage bin',
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
      'No file / missing audit name / wrong file type / missing columns / invalid rows / invalid Operator IDs / storage bins without an operator (errors[] lists every problem with its Excel row)',
  })
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateBomAuditDto,
    @Req() req: AuthRequest,
  ) {
    return this.bomAuditService.createAudit(file, dto, this.actor(req));
  }

  @Post('preview')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fieldSize: Infinity },
    }),
  )
  @ApiOperation({
    summary: 'Check a BOM audit Excel and return the preview (nothing is saved)',
    description:
      'Same reading and checks as Create: columns, every row, Operator IDs in the file. Duplicate materials of a storage bin are merged ' +
      '(quantities added). Returns the storage bins (sorted) with their materials and the Operator given in the file (null = to be assigned on the screen).',
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
          description: '.xlsx or .csv; no application file-size or row-count limit. Columns: StorageBin, Material, Qty (or Avail), Operator (Operator ID, optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'File is valid - preview of storage bins, materials and file operators' })
  @ApiResponse({
    status: 400,
    description: 'No file / wrong file type / missing columns / invalid rows / invalid Operator IDs (errors[] lists every problem with its Excel row)',
  })
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.bomAuditService.previewAudit(file);
  }

  @Get('operators')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Operator dropdown: users with USER role (same as GET /audit/operators)' })
  @ApiResponse({ status: 200, description: 'List of operators' })
  getOperators() {
    return this.bomAuditService.getOperators();
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

  @Patch(':id/operator')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Re-assign the audit to another operator (inline "Assigned To"). Only while ASSIGNED - not after the operator downloaded it.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit re-assigned (or already assigned to that operator)' })
  @ApiResponse({ status: 400, description: 'Operator ID does not exist / is not a Terminal Operator (role USER)' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  @ApiResponse({ status: 409, description: 'Audit is no longer ASSIGNED (already downloaded to the handheld)' })
  reassign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReassignBomAuditDto,
    @Req() req: AuthRequest,
  ) {
    return this.bomAuditService.reassign(id, dto.operatorId, this.actor(req));
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Delete a BOM audit PERMANENTLY (with its locations and materials). Only while ASSIGNED - not after the operator downloaded it.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit deleted permanently' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  @ApiResponse({ status: 409, description: 'Audit is no longer ASSIGNED (already downloaded to the handheld)' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.bomAuditService.remove(id, this.actor(req));
  }

  private actor(req: AuthRequest): BomAuditActor {
    return { userId: Number(req.user.userId), name: req.user.name };
  }
}
