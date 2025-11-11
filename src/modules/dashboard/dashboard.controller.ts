import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { DashboardService } from './dashboard.service';
import { SalesKpiDto } from './dto/sales-kpi.dto';
import { SalesActivityDto } from './dto/sales-activity.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('sales-kpis')
  @Roles('SALES') // This endpoint is only for the SALES role
  @ApiOperation({ summary: 'Get KPI counters for the SALES dashboard' })
  @ApiResponse({ status: 200, type: SalesKpiDto })
  async getSalesKpis(
    @Req() req: AuthRequest, // We get the logged-in user's ID from the AuthRequest
  ): Promise<SalesKpiDto> {
    return this.dashboardService.getSalesKpis(req.user.userId);
  }

  @Get('sales-activity')
  @Roles('SALES')
  @ApiOperation({ summary: 'Get recent activity feed for the SALES dashboard' })
  @ApiResponse({ status: 200, type: [SalesActivityDto] })
  async getSalesRecentActivity(
    @Req() req: AuthRequest,
  ): Promise<SalesActivityDto[]> {
    return this.dashboardService.getSalesRecentActivity(req.user.userId);
  }
}