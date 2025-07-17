import {
  Controller,
  Get,
  UseGuards,
  Body,
  Param,
  Post,
  Patch,
  Delete,
} from '@nestjs/common';
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
  @Post('products')
  createProduct(@Body() dto: { name: string; code: string }) {
    return this.lookupService.createProduct(dto);
  }
  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() dto: { name: string; code: string },
  ) {
    return this.lookupService.updateProduct(+id, dto);
  }
  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    return this.lookupService.deleteProduct(Number(id));
  }

  @Get('transporters')
  getTransporters() {
    return this.lookupService.getTransporters();
  }
  @Post('transporters')
  createTransporter(@Body() dto: { name: string }) {
    return this.lookupService.createTransporter(dto);
  }
  @Patch('transporters/:id')
  updateTransporter(@Param('id') id: string, @Body() dto: { name: string }) {
    return this.lookupService.updateTransporter(+id, dto);
  }
  @Delete('transporters/:id')
  deleteTransporter(@Param('id') id: string) {
    return this.lookupService.deleteTransporter(+id);
  }

  @Get('plant-codes')
  getPlantCodes() {
    return this.lookupService.getPlantCodes();
  }
  @Post('plant-codes')
  createPlantCode(@Body() dto: { code: string; description: string }) {
    return this.lookupService.createPlantCode(dto);
  }
  @Patch('plant-codes/:id')
  updatePlantCode(
    @Param('id') id: string,
    @Body() dto: { code: string; description: string },
  ) {
    return this.lookupService.updatePlantCode(+id, dto);
  }
  @Delete('plant-codes/:id')
  deletePlantCode(@Param('id') id: string) {
    return this.lookupService.deletePlantCode(+id);
  }

  @Get('sales-zones')
  getSalesZones() {
    return this.lookupService.getSalesZones();
  }
  @Post('sales-zones')
  createSalesZone(@Body() dto: { name: string }) {
    return this.lookupService.createSalesZone(dto);
  }
  @Patch('sales-zones/:id')
  updateSalesZone(@Param('id') id: string, @Body() dto: { name: string }) {
    return this.lookupService.updateSalesZone(+id, dto);
  }
  @Delete('sales-zones/:id')
  deleteSalesZone(@Param('id') id: string) {
    return this.lookupService.deleteSalesZone(+id);
  }

  @Get('pack-configs')
  getPackConfigs() {
    return this.lookupService.getPackConfigs();
  }
  @Post('pack-configs')
  createPackConfig(@Body() dto: { configName: string }) {
    return this.lookupService.createPackConfig(dto);
  }
  @Patch('pack-configs/:id')
  updatePackConfig(
    @Param('id') id: string,
    @Body() dto: { configName: string },
  ) {
    return this.lookupService.updatePackConfig(+id, dto);
  }
  @Delete('pack-configs/:id')
  deletePackConfig(@Param('id') id: string) {
    return this.lookupService.deletePackConfig(+id);
  }

  @Get('terminals')
  getTerminals() {
    return this.lookupService.getTerminals();
  }
  @Post('terminals')
  createTerminal(@Body() dto: { name: string }) {
    return this.lookupService.createTerminal(dto);
  }
  @Patch('terminals/:id')
  updateTerminal(@Param('id') id: string, @Body() dto: { name: string }) {
    return this.lookupService.updateTerminal(+id, dto);
  }
  @Delete('terminals/:id')
  deleteTerminal(@Param('id') id: string) {
    return this.lookupService.deleteTerminal(+id);
  }

  @Get('customers')
  getCustomers() {
    return this.lookupService.getCustomers();
  }
  @Post('customers')
  createCustomer(@Body() dto: { name: string; address: string }) {
    return this.lookupService.createCustomer(dto);
  }

  @Patch('customers/:id')
  updateCustomer(
    @Param('id') id: string,
    @Body() dto: { name: string; address: string },
  ) {
    return this.lookupService.updateCustomer(+id, dto);
  }
  @Delete('customers/:id')
  deleteCustomer(@Param('id') id: string) {
    return this.lookupService.deleteCustomer(+id);
  }

  @Get('printers')
  getPrinters() {
    return this.lookupService.getPrinters();
  }
  @Post('printers')
  createPrinter(@Body() dto: { name: string }) {
    return this.lookupService.createPrinter(dto);
  }
  @Patch('printers/:id')
  updatePrinter(@Param('id') id: string, @Body() dto: { name: string }) {
    return this.lookupService.updatePrinter(+id, dto);
  }
  @Delete('printers/:id')
  deletePrinter(@Param('id') id: string) {
    return this.lookupService.deletePrinter(+id);
  }
}
