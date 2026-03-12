import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppUpdateService } from './app-update.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';

@ApiTags('App Updates')
@Controller('app-update')
export class AppUpdateController {
  constructor(private readonly appUpdateService: AppUpdateService) {}

  @Public()
  @Get('app-a/latest-version')
  @ApiOperation({ summary: 'Get the latest APK version info for App A' })
  async getAppALatestVersion(@Req() req: Request) {
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const hostUrl = `${protocol}://${req.get('host')}`;

    return await this.appUpdateService.getLatestVersionInfo(
      'app-a',
      hostUrl,
      '/app-update/app-a/download',
    );
  }

  @Public()
  @Get('app-a/download')
  @ApiOperation({ summary: 'Download the latest APK for App A' })
  async downloadAppAApk(@Res() res: Response): Promise<void> {
    const latestInfo = await this.appUpdateService.getLatestVersionInfo(
      'app-a',
      '',
      '',
    );

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${latestInfo.fileName}"`,
    );
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    await this.appUpdateService.downloadApk('app-a', res);
  }

  @Public()
  @Get('app-b/latest-version')
  @ApiOperation({ summary: 'Get the latest APK version info for App B' })
  async getAppBLatestVersion(@Req() req: Request) {
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const hostUrl = `${protocol}://${req.get('host')}`;

    return await this.appUpdateService.getLatestVersionInfo(
      'app-b',
      hostUrl,
      '/app-update/app-b/download',
    );
  }

  @Public()
  @Get('app-b/download')
  @ApiOperation({ summary: 'Download the latest APK for App B' })
  async downloadAppBApk(@Res() res: Response): Promise<void> {
    const latestInfo = await this.appUpdateService.getLatestVersionInfo(
      'app-b',
      '',
      '',
    );

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${latestInfo.fileName}"`,
    );
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    await this.appUpdateService.downloadApk('app-b', res);
  }
}