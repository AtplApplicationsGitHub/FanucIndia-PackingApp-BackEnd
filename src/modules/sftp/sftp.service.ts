import { Injectable, Logger } from '@nestjs/common';
import Client from 'ssh2-sftp-client';
import * as path from 'path';

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

  // 1. Internal helper that uses an EXISTING client (no new connection)
  private async _ensureDir(c: Client, remoteDir: string) {
    try {
      await c.mkdir(remoteDir, true);
    } catch (err: any) {
      // Ignore error if directory already exists (Race condition fix)
      const type = await c.exists(remoteDir);
      if (type === 'd') return true;
      throw err;
    }
  }

  // 2. Public Ensure Dir (Creates its own connection)
  async ensureDir(remoteDir: string) {
    return this.withClient((c) => this._ensureDir(c, remoteDir));
  }

  // 3. Public Put (Creates its own connection)
  async put(localPath: string, remotePath: string) {
    const remoteDir = path.posix.dirname(remotePath);
    return this.withClient(async (c) => {
      await this._ensureDir(c, remoteDir); // Reuse internal logic
      await c.put(localPath, remotePath);
      return { remotePath, remoteDir };
    });
  }

  // 4. NEW: Batch Upload (One connection for multiple files)
  async uploadBatch(uploads: { localPath: string; remotePath: string }[]) {
    return this.withClient(async (c) => {
      // Optimization: Create directories first (deduplicated)
      const dirs = new Set(uploads.map((u) => path.posix.dirname(u.remotePath)));
      for (const dir of dirs) {
        await this._ensureDir(c, dir);
      }

      // Upload all files
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
    return this.withClient(async (c) => {
      try {
        await c.rmdir(remotePath, true);
        return true;
      } catch (err: any) {
        if (err.code === 2) return false; 
        throw err;
      }
    });
  }
}
