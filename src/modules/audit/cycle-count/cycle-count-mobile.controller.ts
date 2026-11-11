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
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/types/auth-request.type';
import {
  CycleCountAuditMobileService,
  CycleCountAuditOperator,
} from './cycle-count-mobile.service';
import {
  StartCycleCountAuditDto,
  SubmitCycleCountAuditDto,
} from './dto/mobile-cycle-count-audit.dto';

@ApiTags('Cycle Count Audit - Handheld')
@ApiBearerAuth()
@Roles('USER')
@Controller('cycle-count-audit/mobile')
export class CycleCountAuditMobileController {
  constructor(private readonly mobileService: CycleCountAuditMobileService) {}

  @Get('my-tasks')
  @ApiOperation({
    summary: 'My audit tasks: audits assigned to me that are ASSIGNED / IN_PROGRESS',
  })
  @ApiResponse({ status: 200, description: 'List of my open Cycle Count audits (newest first)' })
  myTasks(@Req() req: AuthRequest) {
    return this.mobileService.myTasks(this.operator(req));
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Download one audit (locations + expected materials) for offline work. First download sets IN_PROGRESS (admin can no longer re-assign / delete).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit with locations and materials' })
  @ApiResponse({ status: 403, description: 'Audit is not assigned to me' })
  @ApiResponse({ status: 404, description: 'Audit not found (deleted)' })
  @ApiResponse({ status: 409, description: 'Audit already submitted' })
  download(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    return this.mobileService.download(id, this.operator(req));
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Operator opened the audit: records the start time (status is already IN_PROGRESS since the download). Safe to call again.' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Audit is IN_PROGRESS' })
  @ApiResponse({ status: 403, description: 'Audit is not assigned to me' })
  @ApiResponse({ status: 404, description: 'Audit not found (deleted)' })
  @ApiResponse({ status: 409, description: 'Audit already submitted' })
  start(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StartCycleCountAuditDto,
    @Req() req: AuthRequest,
  ) {
    return this.mobileService.start(id, dto, this.operator(req));
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Upload the completed locations (partial upload). Uploaded locations are locked. When the last location is uploaded the audit becomes RECONCILIATION_PENDING. Same clientSubmissionId again = already saved (200).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Locations saved (or already saved before). data.completed = true when the whole audit is submitted' })
  @ApiResponse({ status: 400, description: 'Results do not match the audit (errors[] lists the problems) / no completed locations to submit' })
  @ApiResponse({ status: 403, description: 'Audit is not assigned to me' })
  @ApiResponse({ status: 404, description: 'Audit not found (deleted)' })
  @ApiResponse({ status: 409, description: 'Audit not downloaded yet / already submitted with another submission' })
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitCycleCountAuditDto,
    @Req() req: AuthRequest,
  ) {
    return this.mobileService.submit(id, dto, this.operator(req));
  }

  private operator(req: AuthRequest): CycleCountAuditOperator {
    return { userId: Number(req.user.userId), name: req.user.name };
  }
}
