import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { AuditService } from './audit.service';

@ApiTags('Audit - Common (Handheld)')
@ApiBearerAuth()
@Roles('USER')
@Controller('audit/mobile')
export class AuditMobileController {
  constructor(private readonly auditService: AuditService) {}

  @Get('my-task-counts')
  @ApiOperation({
    summary:
      'Home "MY AUDIT TASKS" badges: how many audits I still have open (ASSIGNED + IN_PROGRESS) per audit type, in one call',
    description:
      'assigned = new (not downloaded yet), inProgress = downloaded, total = both. Submitted / closed audits are not counted. ' +
      'Location Audit and Free Stock / 4th Axis return 0 (available: false) until those modules are built.',
  })
  @ApiResponse({ status: 200, description: 'Open audit counts per audit type for the logged-in operator' })
  getMyTaskCounts(@Req() req: AuthRequest) {
    return this.auditService.getMyTaskCounts(Number(req.user.userId));
  }
}
