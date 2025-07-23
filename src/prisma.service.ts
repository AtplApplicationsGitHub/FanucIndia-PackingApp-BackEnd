import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Prisma connected');
  }

  // Prisma v5+: "beforeExit" hook is no longer supported/needed

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🛑 Prisma disconnected');
  }
}
