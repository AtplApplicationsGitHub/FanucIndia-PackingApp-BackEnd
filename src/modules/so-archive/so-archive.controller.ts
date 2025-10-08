import { Controller, Post, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { SoArchiveService } from './so-archive.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('so-archive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN') // Restrict these actions to ADMIN role
@Controller('so-archive')
export class SoArchiveController {
  constructor(private readonly soArchiveService: SoArchiveService) {}

  @Post(':soNumber/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a dispatched Sales Order' })
  @ApiParam({ name: 'soNumber', type: String, description: 'The Sales Order Number to archive' })
  async archive(@Param('soNumber') soNumber: string) {
    return this.soArchiveService.archive(soNumber);
  }

  @Delete(':soNumber/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete an archived Sales Order' })
  @ApiParam({ name: 'soNumber', type: String, description: 'The Sales Order Number to delete from archives' })
  async delete(@Param('soNumber') soNumber: string) {
    return this.soArchiveService.delete(soNumber);
  }
}