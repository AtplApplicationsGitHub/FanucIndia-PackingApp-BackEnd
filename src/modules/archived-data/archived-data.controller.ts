import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ArchivedDataService } from './archived-data.service';

@ApiTags('Archived Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('archived-data')
export class ArchivedDataController {
  constructor(private readonly archivedDataService: ArchivedDataService) {}

  @Get()
  @Roles('ADMIN', 'USER') // Adjust roles depending on who should see the archive
  @ApiOperation({ summary: 'Get archived sales orders with filters and search' })
  findAll(@Query() query: any) {
    return this.archivedDataService.findAll(query);
  }
}