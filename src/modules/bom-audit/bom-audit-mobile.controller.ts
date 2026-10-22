import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import {
  BomAuditMobileService,
  BomAuditOperator,
} from './bom-audit-mobile.service';
import {
  StartBomAuditDto,
  SubmitBomAuditDto,
} from './dto/mobile-bom-audit.dto';

/**
 * BOM Completeness - HANDHELD APIs (Stage B), used by the RFID Audit Kotlin app.
 * Login: POST /auth/rfid-login (USER role). Every API works only for the operator the audit is assigned to.
 * The submit route accepts a bigger JSON body (see main.ts / BOM_AUDIT_MOBILE_JSON_LIMIT).
 */
@ApiTags('BOM Audit - Handheld')
@ApiBearerAuth()
@Roles('USER')
@Controller('bom-audit/mobile')
export class BomAuditMobileController {
  constructor(private readonly mobileService: BomAuditMobileService) {}

  @Get('my-tasks')
  @ApiOperation({
    summary: 'My audit tasks: audits assigned to me that are ASSIGNED / DOWNLOADED / IN_PROGRESS',
  })
  @ApiResponse({ status: 200, description: 'List of my open BOM audits (newest first)' })
  myTasks(@Req() req: AuthRequest) {
    return this.mobileService.myTasks(this.operator(req));
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Download one audit (locations + expected materials) for offline work. First download sets DOWNLOADED.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit with locations and materials' })
  @ApiResponse({ status: 403, description: 'Audit is not assigned to me' })
  @ApiResponse({ status: 404, description: 'Audit not found or cancelled' })
  @ApiResponse({ status: 409, description: 'Audit already submitted' })
  download(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.mobileService.download(id, this.operator(req));
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Operator opened the audit: sets IN_PROGRESS (safe to call again)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit is IN_PROGRESS' })
  @ApiResponse({ status: 403, description: 'Audit is not assigned to me' })
  @ApiResponse({ status: 404, description: 'Audit not found or cancelled' })
  @ApiResponse({ status: 409, description: 'Audit already submitted' })
  start(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StartBomAuditDto,
    @Req() req: AuthRequest,
  ) {
    return this.mobileService.start(id, dto, this.operator(req));
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Upload all scan results: sets PENDING_RECONCILIATION. Same clientSubmissionId again = already saved (200).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Results saved (or already saved before)' })
  @ApiResponse({ status: 400, description: 'Results do not match the audit (errors[] lists the problems)' })
  @ApiResponse({ status: 403, description: 'Audit is not assigned to me' })
  @ApiResponse({ status: 404, description: 'Audit not found or cancelled' })
  @ApiResponse({ status: 409, description: 'Audit not downloaded yet / already submitted with another submission' })
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitBomAuditDto,
    @Req() req: AuthRequest,
  ) {
    return this.mobileService.submit(id, dto, this.operator(req));
  }

  private operator(req: AuthRequest): BomAuditOperator {
    return { userId: Number(req.user.userId), name: req.user.name };
  }
}
