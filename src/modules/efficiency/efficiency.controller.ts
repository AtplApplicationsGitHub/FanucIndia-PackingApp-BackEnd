import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EfficiencyService } from './efficiency.service';
import { QueryEfficiencyDto } from './dto/query-efficiency.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('efficiency')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EfficiencyController {
  constructor(private readonly efficiencyService: EfficiencyService) {}

  @Get('report')
  async getReport(@Query() query: QueryEfficiencyDto) {
    const stage = query.stage ?? 'Issue';

    if (!query.from && !query.to) {
      return this.efficiencyService.getReport(null, null, stage);
    }

    const from = new Date(query.from!);
    const to = new Date(query.to!);
    return this.efficiencyService.getReport(from, to, stage);
  }
}
