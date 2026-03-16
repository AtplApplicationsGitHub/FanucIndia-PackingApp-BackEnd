import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get summary list with SO, OBD, Customer, Zone, Payment (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order summary returned successfully' })
  getAdminOrderSummary() {
    return this.reportsSalesOrderService.getAdminOrderSummary();
  }

  // @Get('analysis')
  // @Roles('ADMIN')
  // @ApiOperation({ summary: 'Get reports analysis for Sales Orders' })
  // @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  // @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  // @ApiQuery({ name: 'status', required: false, type: String })
  // @ApiQuery({ name: 'salesZoneId', required: false, type: Number })
  // async getReportsAnalysis(@Query() filters: any) {
  //   return this.reportsSalesOrderService.getSalesOrderReportsAnalysis(filters);
  // }
}
