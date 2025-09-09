import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { FgDashboardService } from './fg-dashboard.service';
import { AuthRequest } from '../auth/types/auth-request.type';

@ApiTags('FG Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fg-dashboard')
export class FgDashboardController {
  constructor(private readonly fgDashboardService: FgDashboardService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'YYYY-MM-DD' })
  getFgDashboardData(@Req() req: AuthRequest, @Query() query: { search?: string, date?: string }) {
    return this.fgDashboardService.getFgDashboardData(req.user, query);
  }
}