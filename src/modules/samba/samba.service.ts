import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SftpService } from '../sftp/sftp.service';
import { Response } from 'express';
import * as archiver from 'archiver';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SambaService {
  private readonly logger = new Logger(SambaService.name);
  private readonly baseDir = process.env.SFTP_BASE_DIR_DRIVE || '/uploads/fanuc/samba_mount_drive';

  constructor(private readonly sftpService: SftpService, private prisma: PrismaService) {}

  async listFiles(folder: string) {
    const validFolders = ['active', 'archive', 'error', 'logs'];
    if (!validFolders.includes(folder.toLowerCase())) {
      throw new BadRequestException('Invalid folder name');
    }

    let targetDir = '';
    if (folder.toLowerCase() === 'logs') {
      targetDir = process.env.ERP_CRON_LOGS || 'uploads/fanuc/logs/';      
      if (targetDir.endsWith('/')) {
        targetDir = targetDir.slice(0, -1);
      }
    } else {
      targetDir = `${this.baseDir}/${folder.toLowerCase()}`;
    }
    try {
      const files = await this.sftpService.list(targetDir);
      return files
        .filter((f) => f.type !== 'd')
        .map((f, index) => ({
          id: index + 1,
          filename: f.name,
          size: f.size,
          createdDatetime: f.modifyTime,
        }));
    } catch (error) {
      this.logger.warn(`Could not read directory ${targetDir}. It might be empty or missing.`);
      return [];
    }
  }

  async downloadFiles(folder: string, filenames: string[], res: Response) {
    if (!filenames || filenames.length === 0) {
      throw new BadRequestException('No files selected');
    }

    let targetDir = '';
    if (folder.toLowerCase() === 'logs') {
      targetDir = process.env.ERP_CRON_LOGS || 'uploads/fanuc/logs/';
      if (targetDir.endsWith('/')) {
        targetDir = targetDir.slice(0, -1);
      }
    } else {
      targetDir = `${this.baseDir}/${folder.toLowerCase()}`;
    }

    if (filenames.length === 1) {
      const remotePath = `${targetDir}/${filenames[0]}`;
      
      // 2. Dynamically set Content-Type based on the file extension
      const ext = filenames[0].split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream'; // default fallback
      
      if (ext === 'xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (ext === 'txt') {
        contentType = 'text/plain';
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filenames[0]}"`);
      res.setHeader('Content-Type', contentType);
      await this.sftpService.streamToResponse(remotePath, res);
    } else {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${folder.toUpperCase()}_FILES.zip"`);
      
      const archive = archiver.create('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => { throw err; });
      archive.pipe(res);

      for (const filename of filenames) {
        const remotePath = `${targetDir}/${filename}`;
        try {
          const buffer = await this.sftpService.getBuffer(remotePath);
          archive.append(buffer, { name: filename });
        } catch (error) {
          this.logger.error(`Skipping missing file: ${filename}`);
        }
      }
      await archive.finalize();
    }
  }

  async getDbLogs(dateStr?: string) {
    const whereClause: any = {};
    
    if (dateStr) {
      const startOfTodayIst = new Date(`${dateStr}T00:00:00.000+05:30`);
      const endOfTodayIst = new Date(`${dateStr}T23:59:59.999+05:30`);
      whereClause.createdAt = {
        gte: new Date(startOfTodayIst.getTime() - 5.5 * 60 * 60 * 1000),
        lte: new Date(endOfTodayIst.getTime() - 5.5 * 60 * 60 * 1000),
      };
    } else {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      whereClause.createdAt = { gte: sevenDaysAgo };
    }

    const logs = await this.prisma.eRP_Data_Cron_Logs.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        saleOrderNumber: true,
        status: true,
        message: true,
        createdAt: true,
      }
    });

    return logs;
  }
}