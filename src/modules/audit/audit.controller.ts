import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';
import { QueryAuditStatusCountsDto } from './dto/query-audit-status-counts.dto';
import { QueryAuditListDto } from './dto/query-audit-list.dto';

@ApiTags('Audit - Common')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('operators')
  @ApiOperation({
    summary: 'Operator dropdown for every audit type: users with the USER role (id, name, email)',
  })
  @ApiResponse({ status: 200, description: 'List of operators' })
  getOperators() {
    return this.auditService.getOperators();
  }

  @Get('statuses')
  @ApiOperation({
    summary:
      'The status list used by every audit type: ASSIGNED, IN_PROGRESS, RECONCILIATION_PENDING, CLOSED (with labels)',
  })
  @ApiResponse({ status: 200, description: 'Statuses with labels and canReassign / canDelete' })
  getStatuses() {
    return this.auditService.getStatuses();
  }

  @Get('status-counts')
  @ApiOperation({
    summary:
      'How many audits are in each status (ASSIGNED, IN_PROGRESS, RECONCILIATION_PENDING, CLOSED) for every audit type + overall total',
    description:
      'One API for all 4 audit types. Optional filters: auditType, fromDate / toDate (audit created date, IST, both days included). ' +
      'Location Audit and Free Stock / 4th Axis return 0 (available: false) until those modules are built.',
  })
  @ApiResponse({ status: 200, description: 'Counts per audit type and status' })
  @ApiResponse({ status: 400, description: 'Invalid auditType or date / date range' })
  getStatusCounts(@Query() query: QueryAuditStatusCountsDto) {
    return this.auditService.getStatusCounts(query);
  }

  @Get('list')
  @ApiOperation({
    summary:
      'Audit Planning table: the audits of ONE audit type (the clicked card, default CYCLE_COUNT) in one common row shape',
    description:
      'Each row has the common columns + storageBinCount (table cell) + storageBins (popup) + actions (which buttons to show) ' +
      '+ details (fields only that audit type has). Search also finds a storage bin. ' +
      'View / re-assign / delete / report: use the audit type\'s own APIs (/bom-audit/..., /cycle-count/...). ' +
      'Location Audit and Free Stock / 4th Axis return an empty list (available: false) until those modules are built.',
  })
  @ApiResponse({ status: 200, description: 'Paginated audits of the selected audit type' })
  @ApiResponse({ status: 400, description: 'Invalid auditType / status / date / date range' })
  listAudits(@Query() query: QueryAuditListDto) {
    return this.auditService.listAudits(query);
  }
}
