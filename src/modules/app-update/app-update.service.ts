import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SftpService } from '../sftp/sftp.service';
import { Response } from 'express';
import * as path from 'path';

@Injectable()
export class AppUpdateService {
  private readonly logger = new Logger(AppUpdateService.name);
  private readonly appPaths: Record<string, string>;

  constructor(private readonly sftpService: SftpService) {
    const pathPickPack = process.env.APK_PATH_PICK_PACK;
    const pathDispatch = process.env.APK_PATH_DISPATCH;

    if (!pathPickPack || !pathDispatch) {
      const errorMsg = 'APK_PATH_PICK_PACK and APK_PATH_DISPATCH must be defined in the .env file';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.appPaths = {
      'pick-pack': pathPickPack,
      'dispatch': pathDispatch,
    };
  }

  private extractVersion(fileName: string): [number, number, number] {
    const match = fileName.match(/Vr[:\s]*(\d+)\.(\d+)\.(\d+)/i);
    if (!match) return [0, 0, 0];
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  private formatVersion(fileName: string): string {
    const match = fileName.match(/Vr[:\s]*(\d+\.\d+\.\d+)/i);
    if (match) return `Vr: ${match[1]}`;
    return fileName.replace(/\.apk$/i, '');
  }

  private getLatestApk(files: string[]): string {
    return [...files].sort((a, b) => {
      const [aMajor, aMinor, aPatch] = this.extractVersion(a);
      const [bMajor, bMinor, bPatch] = this.extractVersion(b);

      if (aMajor !== bMajor) return aMajor - bMajor;
      if (aMinor !== bMinor) return aMinor - bMinor;
      if (aPatch !== bPatch) return aPatch - bPatch;

      return a.localeCompare(b);
    })[files.length - 1];
  }

  private async getLatestApkFile(appName: string): Promise<{
    dirPath: string;
    latestApk: string;
    remotePath: string;
  }> {
    const dirPath = this.appPaths[appName];

    if (!dirPath) {
      throw new NotFoundException(`Application path for '${appName}' not found.`);
    }

    const fileList = (await this.sftpService.list(dirPath)) as Array<{ type: string; name: string; }>;
    const files = fileList
      .filter((file) => file.type === '-' && file.name.toLowerCase().endsWith('.apk'))
      .map((file) => file.name);

    if (!files.length) {
      throw new NotFoundException(`No APK found for application '${appName}'.`);
    }

    const latestApk = this.getLatestApk(files);
    const remotePath = path.posix.join(dirPath, latestApk);

    return { dirPath, latestApk, remotePath };
  }

  async getLatestVersionInfo(appName: string, hostUrl: string, downloadRoute: string) {
    try {
      const { latestApk } = await this.getLatestApkFile(appName);
      return {
        appName,
        latestVersion: this.formatVersion(latestApk),
        fileName: latestApk,
        downloadUrl: hostUrl && downloadRoute ? `${hostUrl}${downloadRoute}` : '',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get latest APK for ${appName}: ${error?.message || error}`, error?.stack);
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException(`Failed to fetch latest APK details for '${appName}'.`);
    }
  }

  async downloadApk(appName: string, res: Response): Promise<void> {
    try {
      const { remotePath } = await this.getLatestApkFile(appName);
      await this.sftpService.streamToResponse(remotePath, res);
    } catch (error: any) {
      this.logger.error(`Failed to download APK for ${appName}: ${error?.message || error}`, error?.stack);
      if (!res.headersSent) {
        res.status(404).json({ message: `Failed to download APK for '${appName}'.` });
      }
    }
  }
}