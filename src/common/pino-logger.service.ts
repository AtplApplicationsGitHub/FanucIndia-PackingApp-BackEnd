// src/common/pino-logger.service.ts
import { LoggerService as NestLoggerService } from '@nestjs/common';
import { logger } from './logger';

export class PinoLogger implements NestLoggerService {
  log(message: string, context?: string) {
    logger.info({ context }, message);
  }
  error(message: string, trace?: string, context?: string) {
    logger.error({ context, trace }, message);
  }
  warn(message: string, context?: string) {
    logger.warn({ context }, message);
  }
  debug?(message: string, context?: string) {
    logger.debug({ context }, message);
  }
  verbose?(message: string, context?: string) {
    logger.trace({ context }, message);
  }
}
