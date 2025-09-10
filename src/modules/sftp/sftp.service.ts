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
      retry_minTimeout: SFTP_RETRY_MIN_TIMEOUT ? Number(SFTP_RETRY_MIN_TIMEOUT) : 500,
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
      } catch {
      }
    }
  }

  async ensureDir(remoteDir: string) {
    return this.withClient(async (c) => {
      const segments = path.posix.normalize(remoteDir).split('/');
      let cur = '';
      for (const seg of segments) {
        if (!seg) continue;
        cur += `/${seg}`;
        const exists = await c.exists(cur); 
        if (!exists) {
          await c.mkdir(cur);
        }
      }
    });
  }

  async put(localPath: string, remotePath: string) {
    const remoteDir = path.posix.dirname(remotePath);
    await this.ensureDir(remoteDir);
    await this.withClient((c) => c.put(localPath, remotePath));
    return { remotePath, remoteDir };
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
}
