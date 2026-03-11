import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './modules/auth/public.decorator';
import * as pkg from '../package.json';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('dummy')
  getDummy() {
    return this.appService.getDummy();
  }

  @Public()
  @Get('version')
  getVersion() {
    return {
      name: pkg.name,
      version: pkg.version,
    };
  }
}
