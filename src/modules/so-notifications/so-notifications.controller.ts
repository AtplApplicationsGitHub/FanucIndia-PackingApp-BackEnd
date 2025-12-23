import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { SoNotificationsService } from './so-notifications.service';

@ApiTags('SO Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('so-notifications')
export class SoNotificationsController {
  constructor(private readonly service: SoNotificationsService) {}

  @Get()
  @Roles('ADMIN', 'SALES', 'USER')
  list(@Req() req: AuthRequest) {
    return this.service.list(req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SALES', 'USER')
  delete(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.delete(Number(id), req.user);
  }
}
