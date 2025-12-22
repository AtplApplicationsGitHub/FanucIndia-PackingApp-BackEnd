import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { DashboardService } from './dashboard.service';
import { SalesKpiDto } from './dto/sales-kpi.dto';
import { SalesActivityDto } from './dto/sales-activity.dto';
import { AdminKpiDto } from './dto/admin-kpi.dto';
import { SalesPaymentClearanceDto } from './dto/sales-payment-clearance.dto';
import { AdminNewImportDto } from './dto/admin-new-imports.dto'; 
import { AdminDispatchSummaryDto } from './dto/admin-dispatch-summary.dto'; 
import { AdminOverallStatusDto } from './dto/admin-overall-status.dto'; 
import { AdminStatusByZoneDto } from './dto/admin-status-by-zone.dto';
import { AdminPaymentByZoneDto } from './dto/admin-payment-by-zone.dto';
import { AdminCountByEntityDto } from './dto/admin-count-by-entity.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin-kpis')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get KPI counters for the ADMIN dashboard' })
  @ApiResponse({ status: 200, type: AdminKpiDto })
  async getAdminKpis(): Promise<AdminKpiDto> {
    return this.dashboardService.getAdminKpis();
  }

  @Get('admin-new-imports')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get new material import counts for the last 5 days' })
  @ApiResponse({ status: 200, type: [AdminNewImportDto] })
  async getAdminNewImports(): Promise<AdminNewImportDto[]> {
    return this.dashboardService.getAdminNewImports();
  }

  @Get('admin-dispatch-summary')
  @Roles('ADMIN')
  @ApiOperation({ summary: "Get today's dispatch summary" })
  @ApiResponse({ status: 200, type: AdminDispatchSummaryDto })
  async getAdminDispatchSummary(): Promise<AdminDispatchSummaryDto> {
    return this.dashboardService.getAdminDispatchSummary();
  }

  @Get('admin-overall-status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system-wide counts of orders by status' })
  @ApiResponse({ status: 200, type: AdminOverallStatusDto })
  async getAdminOverallStatus(): Promise<AdminOverallStatusDto> {
    return this.dashboardService.getAdminOverallStatus();
  }

  @Get('admin-status-by-zone')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system-wide order status counts by sales zone (Row 3)' })
  @ApiResponse({ status: 200, type: [AdminStatusByZoneDto] })
  async getAdminStatusByZone(): Promise<AdminStatusByZoneDto[]> {
    return this.dashboardService.getAdminStatusByZone();
  }

  @Get('admin-payment-by-zone')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system-wide payment clearance counts by sales zone (Row 4)' })
  @ApiResponse({ status: 200, type: [AdminPaymentByZoneDto] })
  async getAdminPaymentByZone(): Promise<AdminPaymentByZoneDto[]> {
    return this.dashboardService.getAdminPaymentByZone();
  }

  @Get('admin-orders-by-product')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system-wide order counts by product (Row 5)' })
  @ApiResponse({ status: 200, type: [AdminCountByEntityDto] })
  async getAdminOrdersByProduct(): Promise<AdminCountByEntityDto[]> {
    return this.dashboardService.getAdminOrdersByProduct();
  }

  @Get('admin-orders-by-customer')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system-wide order counts by customer (Row 5)' })
  @ApiResponse({ status: 200, type: [AdminCountByEntityDto] })
  async getAdminOrdersByCustomer(): Promise<AdminCountByEntityDto[]> {
    return this.dashboardService.getAdminOrdersByCustomer();
  }

  @Get('sales-kpis')
  @Roles('SALES')
  @ApiOperation({ summary: 'Get KPI counters for the SALES dashboard' })
  @ApiResponse({ status: 200, type: SalesKpiDto })
  async getSalesKpis(
    @Req() req: AuthRequest,
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