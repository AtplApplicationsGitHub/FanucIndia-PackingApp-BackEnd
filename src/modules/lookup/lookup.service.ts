import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class LookupService {
  constructor(private prisma: PrismaService) {}

  getProducts() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  getTransporters() {
    return this.prisma.transporter.findMany({ orderBy: { name: 'asc' } });
  }

  getPlantCodes() {
    return this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } });
  }

  getSalesZones() {
    return this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } });
  }

  getPackConfigs() {
    return this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } });
  }
}
