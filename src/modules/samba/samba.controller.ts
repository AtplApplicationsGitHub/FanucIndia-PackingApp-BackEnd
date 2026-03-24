import { Controller, Get, Post, Query, Body, Res, UseGuards } from '@nestjs/common';
import { SambaService } from './samba.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Samba')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('samba')
export class SambaController {
  constructor(private readonly sambaService: SambaService) {}

  @Get('files')
  @Roles('ADMIN')
  async getFiles(@Query('folder') folder: string) {
    return this.sambaService.listFiles(folder);
  }

  @Post('download')
  @Roles('ADMIN')
  async downloadFiles(
    @Body() body: { folder: string; filenames: string[] },
    @Res() res: Response,
  ) {
    return this.sambaService.downloadFiles(body.folder, body.filenames, res);
  }

  @Get('db-logs')
  @Roles('ADMIN')
  async getDbLogs(@Query('date') date?: string) {
    return this.sambaService.getDbLogs(date);
  }
}