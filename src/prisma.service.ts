import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Log queries in dev mode to catch performance issues early
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      transactionOptions: {
        maxWait: 10000,
        timeout: 30000,
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🛑 Prisma disconnected');
  }
}