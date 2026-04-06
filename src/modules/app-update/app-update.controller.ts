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
  @Get('pick-pack/latest-version')
  @ApiOperation({ summary: 'Get the latest APK version info for Pick & Pack App' })
  async getPickPackLatestVersion(@Req() req: Request) {
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const hostUrl = `${protocol}://${req.get('host')}`;
    return await this.appUpdateService.getLatestVersionInfo('pick-pack', hostUrl, '/app-update/pick-pack/download');
  }

  @Public()
  @Get('pick-pack/download')
  @ApiOperation({ summary: 'Download the latest APK for Pick & Pack App' })
  async downloadPickPackApk(@Res() res: Response): Promise<void> {
    const latestInfo = await this.appUpdateService.getLatestVersionInfo('pick-pack', '', '');
    this.setApkHeaders(res, latestInfo.fileName);
    await this.appUpdateService.downloadApk('pick-pack', res);
  }

  @Public()
  @Get('dispatch/latest-version')
  @ApiOperation({ summary: 'Get the latest APK version info for Dispatch App' })
  async getDispatchLatestVersion(@Req() req: Request) {
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const hostUrl = `${protocol}://${req.get('host')}`;
    return await this.appUpdateService.getLatestVersionInfo('dispatch', hostUrl, '/app-update/dispatch/download');
  }

  @Public()
  @Get('dispatch/download')
  @ApiOperation({ summary: 'Download the latest APK for Dispatch App' })
  async downloadDispatchApk(@Res() res: Response): Promise<void> {
    const latestInfo = await this.appUpdateService.getLatestVersionInfo('dispatch', '', '');
    this.setApkHeaders(res, latestInfo.fileName);
    await this.appUpdateService.downloadApk('dispatch', res);
  }

  // Helper method to keep code clean
  private setApkHeaders(res: Response, fileName: string) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}