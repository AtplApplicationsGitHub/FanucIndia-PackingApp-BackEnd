import {
  Body,
  Controller,
  Get,
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
import { BomAuditActor, BomAuditService } from './bom-audit.service';
import { CreateBomAuditDto } from './dto/create-bom-audit.dto';
import { QueryBomAuditDto } from './dto/query-bom-audit.dto';
import { BOM_AUDIT_MAX_FILE_BYTES } from './bom-audit.constants';

@ApiTags('BOM Audit')
@ApiBearerAuth()
@Controller('bom-audit')
export class BomAuditController {
  constructor(private readonly bomAuditService: BomAuditService) {}

  @Post()
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: BOM_AUDIT_MAX_FILE_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    summary:
      'Create a BOM audit: upload Excel/CSV (Material Code, Storage, Qty) and assign an operator',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'operatorId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            '.xlsx or .csv, max 10 MB, columns: Material Code, Storage, Qty',
        },
        operatorId: { type: 'integer', example: 12 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Audit created (status ASSIGNED)' })
  @ApiResponse({
    status: 400,
    description:
      'No file / wrong file type / missing columns / invalid rows (errors[] lists every bad row) / invalid operator',
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
