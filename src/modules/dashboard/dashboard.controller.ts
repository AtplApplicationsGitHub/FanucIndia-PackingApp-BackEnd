import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
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
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('admin-kpis')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Get KPI counters for the ADMIN dashboard' })
  @ApiResponse({ status: 200, type: AdminKpiDto })
  async getAdminKpis(@Query('date') date?: string): Promise<AdminKpiDto> {
    return this.dashboardService.getAdminKpis(date);
  }

  @Get('admin-new-imports')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Get new material import counts for the last 5 days' })
  @ApiResponse({ status: 200, type: [AdminNewImportDto] })
  async getAdminNewImports(): Promise<AdminNewImportDto[]> {
    return this.dashboardService.getAdminNewImports();
  }

  @Get('admin-dispatch-summary')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: "Get today's dispatch summary" })
  @ApiResponse({ status: 200, type: AdminDispatchSummaryDto })
  async getAdminDispatchSummary(@Query('date') date?: string): Promise<AdminDispatchSummaryDto> {
    return this.dashboardService.getAdminDispatchSummary(date);
  }

  @Get('admin-overall-status')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Get system-wide counts of orders by status' })
  @ApiResponse({ status: 200, type: AdminOverallStatusDto })
  async getAdminOverallStatus(@Query('date') date?: string): Promise<AdminOverallStatusDto> {
    return this.dashboardService.getAdminOverallStatus(date);
  }

  @Get('admin-status-by-zone')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system-wide order status counts by sales zone (Row 3)' })
  @ApiResponse({ status: 200, type: [AdminStatusByZoneDto] })
  async getAdminStatusByZone(@Query('date') date?: string): Promise<AdminStatusByZoneDto[]> {
    return this.dashboardService.getAdminStatusByZone(date);
  }

  @Get('admin-payment-by-zone')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system-wide payment clearance counts by sales zone (Row 4)' })
  @ApiResponse({ status: 200, type: [AdminPaymentByZoneDto] })
  async getAdminPaymentByZone(@Query('date') date?: string): Promise<AdminPaymentByZoneDto[]> {
    return this.dashboardService.getAdminPaymentByZone(date);
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
  async getSalesKpis(@Req() req: AuthRequest): Promise<SalesKpiDto> {
    return this.dashboardService.getSalesKpis(req.user.userId);
  }

  @Get('sales-activity')
  @Roles('SALES')
  @ApiOperation({ summary: 'Get recent activity feed for the SALES dashboard' })
  @ApiResponse({ status: 200, type: [SalesActivityDto] })
  async getSalesRecentActivity(@Req() req: AuthRequest): Promise<SalesActivityDto[]> {
    return this.dashboardService.getSalesRecentActivity(req.user.userId);
  }

  @Get('sales-dispatch-summary')
  @Roles('SALES')
  @ApiOperation({ summary: "Get today's dispatch summary for Sales Zone" })
  async getSalesDispatchSummary(@Req() req: AuthRequest, @Query('date') date?: string) {
    return this.dashboardService.getSalesDispatchSummary(req.user.userId, date);
  }

  @Get('sales-new-imports')
  @Roles('SALES')
  async getSalesNewImports(@Req() req: AuthRequest) {
    return this.dashboardService.getSalesNewImports(req.user.userId);
  }

  @Get('sales-upcoming-orders')
  @Roles('SALES')
  async getSalesUpcomingOrders(@Req() req: AuthRequest) {
    return this.dashboardService.getSalesUpcomingOrders(req.user.userId);
  }

  @Get('sales-overall-status')
  @Roles('SALES')
  async getSalesOverallStatus(@Req() req: AuthRequest, @Query('date') date?: string) {
    return this.dashboardService.getSalesOverallStatus(req.user.userId, date);
  }

  @Get('sales-payment-clearance')
  @Roles('SALES') // Find this existing one and update it to accept the date Query
  async getSalesPaymentClearance(@Req() req: AuthRequest, @Query('date') date?: string) {
    return this.dashboardService.getSalesPaymentClearanceByZone(req.user.userId, date);
  }

  @Get('admin-upcoming-orders')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Get upcoming material order counts for the next 5 days' })
  @ApiResponse({ status: 200, type: [AdminNewImportDto] })
  async getAdminUpcomingOrders(): Promise<AdminNewImportDto[]> {
    return this.dashboardService.getAdminUpcomingOrders();
  }

  @Get('admin-status-by-customer')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get system-wide order status counts by Top 15 Customers' })
  async getAdminStatusByCustomer(@Query('date') date?: string) {
    return this.dashboardService.getAdminStatusByCustomer(date);
  }

  @Get('admin-payment-by-customer')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get payment clearance counts by Top 15 Customers' })
  async getAdminPaymentByCustomer(@Query('date') date?: string) {
    return this.dashboardService.getAdminPaymentByCustomer(date);
  }

  @Get('operator-stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get Operator assigned vs closed stats' })
  async getOperatorStats(@Query('date') date?: string) {
    return this.dashboardService.getOperatorStats(date);
  }

  @Get('sales-status-by-customer')
  @Roles('SALES')
  @ApiOperation({ summary: 'Get order status counts by Customers for Sales Zone' })
  async getSalesStatusByCustomer(@Req() req: AuthRequest, @Query('date') date?: string) {
    return this.dashboardService.getSalesStatusByCustomer(req.user.userId, date);
  }
}