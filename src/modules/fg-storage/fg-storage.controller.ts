import { Controller, Body, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FgStorageService } from './fg-storage.service';
import { UpdateFgLocationDto } from './dto/update-fg-location.dto';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('FG Storage')
@ApiBearerAuth()
@Controller('fg-storage')
@UseGuards(JwtAuthGuard) 
export class FgStorageController {
  constructor(private readonly fgStorageService: FgStorageService) {}

  @Patch('assign-location')
  @Roles('USER', 'ADMIN') 
  @ApiOperation({ summary: 'Assign an FG Location to a Sales Order' })
  @ApiResponse({ status: 200, description: 'FG Location updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User does not have permission.' })
  @ApiResponse({ status: 404, description: 'Sales Order not found.' })
  assignFgLocation(
    @Body() updateFgLocationDto: UpdateFgLocationDto,
    @Req() req: AuthRequest, 
  ) {
    return this.fgStorageService.assignFgLocation(updateFgLocationDto, req.user);
  }
}