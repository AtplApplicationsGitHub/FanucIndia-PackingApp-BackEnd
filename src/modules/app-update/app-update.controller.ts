import { Controller, Get, Req, Res, Header } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppUpdateService } from './app-update.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('App Updates')
@Controller('app-update')
export class AppUpdateController {
  constructor(private readonly appUpdateService: AppUpdateService) {}

  @Get('app-a/latest-version')
  @ApiOperation({ summary: 'Get the latest APK version info for App A' })
  async getAppALatestVersion(@Req() req: Request) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const hostUrl = `${protocol}://${req.get('host')}`;
    
    return await this.appUpdateService.getLatestVersionInfo('app-a', hostUrl, '/app-update/app-a/download');
  }

  @Get('app-a/download')
  @ApiOperation({ summary: 'Download the latest APK for App A' })
  @Header('Content-Type', 'application/vnd.android.package-archive')
  async downloadAppAApk(@Res({ passthrough: true }) res: Response) {
    const latestInfo = await this.appUpdateService.getLatestVersionInfo('app-a', '', '');
    
    res.set({
      'Content-Disposition': `attachment; filename="${latestInfo.fileName}"`,
    });
    
    return await this.appUpdateService.downloadApk('app-a');
  }

  @Get('app-b/latest-version')
  @ApiOperation({ summary: 'Get the latest APK version info for App B' })
  async getAppBLatestVersion(@Req() req: Request) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const hostUrl = `${protocol}://${req.get('host')}`;
    
    return await this.appUpdateService.getLatestVersionInfo('app-b', hostUrl, '/app-update/app-b/download');
  }

  @Get('app-b/download')
  @ApiOperation({ summary: 'Download the latest APK for App B' })
  @Header('Content-Type', 'application/vnd.android.package-archive')
  async downloadAppBApk(@Res({ passthrough: true }) res: Response) {
    const latestInfo = await this.appUpdateService.getLatestVersionInfo('app-b', '', '');
    
    res.set({
      'Content-Disposition': `attachment; filename="${latestInfo.fileName}"`,
    });
    
    return await this.appUpdateService.downloadApk('app-b');
  }
}