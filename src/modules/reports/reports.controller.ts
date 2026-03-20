import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportsSalesOrderService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports/sales-order')
export class ReportsSalesOrderController {
  constructor(private readonly reportsSalesOrderService: ReportsSalesOrderService) {}

  @Get('summary')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get summary list with SO, OBD, Customer, Zone, Payment and Filters (Combined)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'payment', required: false, type: String })
  @ApiQuery({ name: 'salesZoneId', required: false, type: Number })
  @ApiQuery({ name: 'customerId', required: false, type: Number })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, options: 10, 20, 50, 100)' })
  @ApiResponse({ status: 200, description: 'Order summary returned successfully' })
  getAdminOrderSummary(@Query() filters: any) {
    return this.reportsSalesOrderService.getAdminOrderSummary(filters);
  }

  @Get('customer-report')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get report of how many Sales Orders per Customer' })
  @ApiResponse({ status: 200, description: 'Customer report returned successfully' })
  getCustomerReport() {
    return this.reportsSalesOrderService.getCustomerReport();
  }

  @Get('customers-by-material/:materialCode')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get report of customers who ordered a specific material code' })
  @ApiResponse({ status: 200, description: 'Customer report filtered by material returned successfully' })
  getCustomerReportByMaterialCode(@Param('materialCode') materialCode: string) {
    return this.reportsSalesOrderService.getCustomerReportByMaterialCode(materialCode);
  }

  @Get('fg-storage-report')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get report of FG Storage with orders not dispatched' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, options: 10, 20, 50, 100)' })
  @ApiResponse({ status: 200, description: 'FG storage report returned successfully' })
  getFgStorageReport(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsSalesOrderService.getFgStorageReport(page, limit);
  }
}