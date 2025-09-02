import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SoSearchService } from './so-search.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';

@ApiTags('SO Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('so-search')
export class SoSearchController {
  constructor(private readonly soSearchService: SoSearchService) {}

  @Get(':soNumber')
  @Roles('ADMIN', 'USER', 'SALES')
  findDetails(@Param('soNumber') soNumber: string, @Req() req: AuthRequest) {
    return this.soSearchService.findDetailsBySoNumber(soNumber, req.user);
  }
}