import { Injectable, Logger } from '@nestjs/common';
import Client, { FileInfo } from 'ssh2-sftp-client';
import * as path from 'path';
import { Response } from 'express';

type ConnectOptions = {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  passphrase?: string;
  retries?: number;
  retry_factor?: number;
  retry_minTimeout?: number;
  readyTimeout?: number;
};

@Injectable()
export class SftpService {
  private readonly logger = new Logger(SftpService.name);

  private getConfig(): ConnectOptions {
    const {
      SFTP_HOST,
      SFTP_PORT,
      SFTP_USERNAME,
      SFTP_PASSWORD,
      SFTP_PRIVATE_KEY,
      SFTP_PASSPHRASE,
      SFTP_RETRIES,
      SFTP_RETRY_FACTOR,
      SFTP_RETRY_MIN_TIMEOUT,
      SFTP_READY_TIMEOUT,
    } = process.env;

    if (!SFTP_HOST) throw new Error('SFTP_HOST is required');
    if (!SFTP_USERNAME) throw new Error('SFTP_USERNAME is required');
    if (!SFTP_PASSWORD && !SFTP_PRIVATE_KEY) {
      throw new Error('Either SFTP_PASSWORD or SFTP_PRIVATE_KEY must be set');
    }

    const cfg: ConnectOptions = {
      host: SFTP_HOST,
      port: SFTP_PORT ? Number(SFTP_PORT) : 22,
      username: SFTP_USERNAME,
      retries: SFTP_RETRIES ? Number(SFTP_RETRIES) : 2,
      retry_factor: SFTP_RETRY_FACTOR ? Number(SFTP_RETRY_FACTOR) : 2,
      retry_minTimeout: SFTP_RETRY_MIN_TIMEOUT
        ? Number(SFTP_RETRY_MIN_TIMEOUT)
        : 500,
      readyTimeout: SFTP_READY_TIMEOUT ? Number(SFTP_READY_TIMEOUT) : 20000,
    };

    if (SFTP_PRIVATE_KEY) {
      cfg.privateKey = Buffer.from(SFTP_PRIVATE_KEY, 'base64');
      if (SFTP_PASSPHRASE) cfg.passphrase = SFTP_PASSPHRASE;
    } else {
      cfg.password = SFTP_PASSWORD!;
    }

    return cfg;
  }

  private async withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
    const client = new Client();
    try {
      await client.connect(this.getConfig());
      return await fn(client);
    } catch (err: any) {
      this.logger.error(`SFTP operation failed: ${err?.message || err}`);
      throw err;
    } finally {
      try {
        await client.end();
      } catch {}
    }
  }

  private async _ensureDir(c: Client, remoteDir: string) {
    try {
      await c.mkdir(remoteDir, true);
    } catch (err: any) {
      const type = await c.exists(remoteDir);
      if (type === 'd') return true;
      throw err;
    }
  }

  async ensureDir(remoteDir: string) {
    return this.withClient((c) => this._ensureDir(c, remoteDir));
  }

  async put(localPathOrBuffer: string | Buffer, remotePath: string) {
    const remoteDir = path.posix.dirname(remotePath);
    return this.withClient(async (c) => {
      await this._ensureDir(c, remoteDir);
      await c.put(localPathOrBuffer, remotePath);
      return { remotePath, remoteDir };
    });
  }

  async uploadBatch(uploads: { localPath: string; remotePath: string }[]) {
    return this.withClient(async (c) => {
      const dirs = new Set(
        uploads.map((u) => path.posix.dirname(u.remotePath)),
      );
      for (const dir of dirs) {
        await this._ensureDir(c, dir);
      }

      for (const u of uploads) {
        await c.put(u.localPath, u.remotePath);
      }
    });
  }

  async getStream(remotePath: string) {
    return this.withClient((c) => c.get(remotePath));
  }

  async delete(remotePath: string) {
    return this.withClient(async (c) => {
      const exists = await c.exists(remotePath);
      if (!exists) return false;
      await c.delete(remotePath, false);
      return true;
    });
  }

  async rmdir(remotePath: string) {
    if (!remotePath || typeof remotePath !== 'string') {
      throw new Error('Invalid remote path');
    }

    const normalized = path.posix.normalize(remotePath);
    if (normalized.split('/').includes('..')) {
      throw new Error('Invalid remote path: traversal not allowed');
    }

    return this.withClient(async (c) => {
      try {
        await c.rmdir(normalized, true);
        return true;
      } catch (err: any) {
        if (err.code === 2) return false;
        throw err;
      }
    });
  }

  async exists(remotePath: string) {
    return this.withClient((c) => c.exists(remotePath));
  }

  async rename(remoteSourcePath: string, remoteDestPath: string) {
    return this.withClient(async (c) => {
      const destDir = path.posix.dirname(remoteDestPath);
      await this._ensureDir(c, destDir);
      return c.rename(remoteSourcePath, remoteDestPath);
    });
  }

  async getBuffer(remotePath: string): Promise<Buffer> {
    return this.withClient(async (c) => {
      const result = await c.get(remotePath);
      if (Buffer.isBuffer(result)) {
        return result;
      }
      throw new Error('SFTP get did not return a buffer');
    });
  }

  async list(remoteDir: string): Promise<FileInfo[]> {
    return this.withClient((c) => c.list(remoteDir));
  }

  async streamToResponse(remotePath: string, res: Response): Promise<void> {
    const client = new Client();
    try {
      await client.connect(this.getConfig());
      
      // 1. Get the exact file size from the SFTP server
      const fileStat = await client.stat(remotePath);
      
      // 2. Tell Postman/Browser exactly how many bytes to expect so it knows when to stop
      res.setHeader('Content-Length', fileStat.size);

      // 3. Stream the file directly to the client
      await client.get(remotePath, res);

    } catch (err: any) {
      this.logger.error(`SFTP stream error: ${err?.message || err}`);
      if (!res.headersSent) {
        res.status(500).send('Error downloading file from SFTP');
      }
    } finally {
      // 4. CRITICAL: Force the Express response to terminate. 
      // This tells Postman "The file is completely done, stop spinning!"
      res.end();

      // Safely close the SFTP SSH connection
      try {
        await client.end();
      } catch (e) {}
    }
  }

  // Add this inside the SftpService class
  async checkConnection(): Promise<boolean> {
    try {
      // Use the base directory variable you mentioned, default to root if not set
      const testPath = process.env.SFTP_BASE_DIR_DRIVE || '/';
      
      return await this.withClient(async (c) => {
        // Checking if the path exists validates both authentication and network reachability
        const exists = await c.exists(testPath);
        return !!exists;
      });
    } catch (error: any) {
      this.logger.error(`Samba/SFTP Connection Check Failed: ${error?.message || error}`);
      return false; // Connection is DOWN
    }
  }
}
