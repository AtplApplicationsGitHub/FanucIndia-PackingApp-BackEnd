import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getDummy() {
    return {
      message: 'This is a dummy API response',
      status: 'success',
      timestamp: new Date().toISOString(),
    };
  }
}
