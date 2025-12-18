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
  @ApiQuery({ name: 'payment', required: false, type: String, description: 'true/false' })
  @ApiQuery({ name: 'zone', required: false, type: String, description: 'Sales Zone ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Status string' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  getFgDashboardData(
    @Req() req: AuthRequest, 
    @Query() query: { 
      search?: string, 
      date?: string, 
      payment?: string,
      zone?: string,
      status?: string,
      page?: string, 
      limit?: string 
    }
  ) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    return this.fgDashboardService.getFgDashboardData(req.user, { ...query, page, limit });
  }
}