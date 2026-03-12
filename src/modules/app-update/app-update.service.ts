import { Injectable, NotFoundException, StreamableFile, Logger } from '@nestjs/common';
import { SftpService } from '../sftp/sftp.service';

@Injectable()
export class AppUpdateService {
  private readonly logger = new Logger(AppUpdateService.name);
  private readonly appPaths: Record<string, string>;

  constructor(private readonly sftpService: SftpService) {
    const pathA = process.env.APK_PATH_APP_A;
    const pathB = process.env.APK_PATH_APP_B;

    if (!pathA || !pathB) {
      const errorMsg = 'APK_PATH_APP_A and APK_PATH_APP_B must be defined in the .env file';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.appPaths = {
      'app-a': pathA,
      'app-b': pathB,
    };
  }

  // Added 'downloadRoute' parameter here
  async getLatestVersionInfo(appName: string, hostUrl: string, downloadRoute: string) {
    const dirPath = this.appPaths[appName];

    if (!dirPath) {
      throw new NotFoundException(`Application path for '${appName}' not found.`);
    }

    try {
      const fileList = (await this.sftpService.list(dirPath)) as Array<{
        type: string;
        name: string;
      }>;
      
      const files = fileList
        .filter(file => file.type === '-' && file.name.endsWith('.apk'))
        .map(file => file.name);

      if (files.length === 0) {
        throw new NotFoundException(`No APK found for application '${appName}'.`);
      }

      files.sort();
      const latestApk = files[files.length - 1];

      const versionMatch = latestApk.match(/Vr:(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : latestApk.replace('.apk', '');

      return {
        appName,
        latestVersion: versionMatch ? `Vr: ${version}` : version,
        fileName: latestApk,
        downloadUrl: `${hostUrl}${downloadRoute}`, 
      };
    } catch (error) {
      throw new NotFoundException(`Could not read directory '${appName}' from SFTP server.`);
    }
  }

  async downloadApk(appName: string): Promise<StreamableFile> {
    const dirPath = this.appPaths[appName];
    
    const fileList = (await this.sftpService.list(dirPath)) as Array<{
      type: string;
      name: string;
    }>;
    
    const files = fileList
      .filter(file => file.type === '-' && file.name.endsWith('.apk'))
      .map(file => file.name);

    files.sort();
    const latestApk = files[files.length - 1];

    if (!latestApk) {
      throw new NotFoundException('APK file not found.');
    }

    const remotePath = `${dirPath}${latestApk}`;
    const fileBuffer = await this.sftpService.getBuffer(remotePath);
    
    return new StreamableFile(fileBuffer);
  }
}