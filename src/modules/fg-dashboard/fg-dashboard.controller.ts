import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  getFgDashboardData(@Req() req: AuthRequest) {
    return this.fgDashboardService.getFgDashboardData(req.user);
  }
}