import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './modules/auth/public.decorator';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('dummy')
  getDummy(): Record<string, unknown> {
    return this.appService.getDummy();
  }

  @Public()
  @Get('version')
  getVersion(): Record<string, string> {
    return {
      name: this.configService.get<string>('npm_package_name') || 'fanuc-india-packing-app-back-end',
      version: this.configService.get<string>('npm_package_version') || '0.2.1',
    };
  }
}