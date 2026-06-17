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
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const from = query.from ? new Date(query.from) : today;
    const to = query.to ? new Date(query.to) : today;

    return this.efficiencyService.getReport(from, to);
  }
}