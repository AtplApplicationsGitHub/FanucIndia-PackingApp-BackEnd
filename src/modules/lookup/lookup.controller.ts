import { Controller, Get, UseGuards } from '@nestjs/common';
import { LookupService } from './lookup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Lookup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lookup')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('products')
  getProducts() {
    return this.lookupService.getProducts();
  }

  @Get('transporters')
  getTransporters() {
    return this.lookupService.getTransporters();
  }

  @Get('plant-codes')
  getPlantCodes() {
    return this.lookupService.getPlantCodes();
  }

  @Get('sales-zones')
  getSalesZones() {
    return this.lookupService.getSalesZones();
  }

  @Get('pack-configs')
  getPackConfigs() {
    return this.lookupService.getPackConfigs();
  }
}
