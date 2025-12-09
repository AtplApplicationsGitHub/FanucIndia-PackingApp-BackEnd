import { Controller, Post, Delete, Param, UseGuards, HttpCode, HttpStatus, Get, ParseIntPipe, Res, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { SoArchiveService } from './so-archive.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';

@ApiTags('so-archive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN') 
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
    
    const isValid = /^[a-zA-Z0-9\-_]+$/.test(soNumber);

    if (!isValid) {
        throw new BadRequestException("Invalid Sales Order Number format");
    }

    return this.soArchiveService.delete(soNumber);
  }

  @Get('attachments/:fileId/download')
  @Roles('ADMIN', 'USER', 'SALES')
  async downloadArchivedAttachment(
    @Param('fileId', ParseIntPipe) fileId: number,
    @Res() res: Response,
  ) {
    return this.soArchiveService.downloadArchivedFile(fileId, res);
  }

  @Get('dispatch/:id/attachments/:fileName')
  @Roles('ADMIN', 'USER', 'SALES')
  async downloadArchivedDispatchAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    return this.soArchiveService.downloadDispatchFile(id, fileName, res);
  }

  @Get('vehicle-entry/:id/attachments/:fileName')
  @Roles('ADMIN', 'USER', 'SALES')
  async downloadArchivedVehicleAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    return this.soArchiveService.downloadVehicleFile(id, fileName, res);
  }
}