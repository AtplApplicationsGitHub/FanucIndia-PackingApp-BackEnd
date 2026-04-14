import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getDummy(): Record<string, unknown> {
    return {
      message: 'This is a dummy API response',
      status: 'success',
      timestamp: new Date().toISOString(),
    };
  }
}