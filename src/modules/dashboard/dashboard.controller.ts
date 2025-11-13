import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { DashboardService } from './dashboard.service';
import { SalesKpiDto } from './dto/sales-kpi.dto';
import { SalesActivityDto } from './dto/sales-activity.dto';
import { AdminKpiDto } from './dto/admin-kpi.dto';
import { SalesPaymentClearanceDto } from './dto/sales-payment-clearance.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin-kpis')
  @Roles('ADMIN') // This endpoint is only for the ADMIN role
  @ApiOperation({ summary: 'Get KPI counters for the ADMIN dashboard' })
  @ApiResponse({ status: 200, type: AdminKpiDto })
  async getAdminKpis(): Promise<AdminKpiDto> {
    return this.dashboardService.getAdminKpis();
  }

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

  @Get('sales-payment-clearance')
  @Roles('SALES')
  @ApiOperation({
    summary:
      'Get payment clearance counts by sales zone for the SALES user (for graph)',
  })
  @ApiResponse({ status: 200, type: [SalesPaymentClearanceDto] })
  async getSalesPaymentClearance(
    @Req() req: AuthRequest,
  ): Promise<SalesPaymentClearanceDto[]> {
    return this.dashboardService.getSalesPaymentClearanceByZone(
      req.user.userId,
    );
  }
}