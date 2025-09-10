import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { LookupService } from './lookup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateProductDto } from './dto/createProductDto';
import { UpdateProductDto } from './dto/updateProductDto';
import { CreateTransporterDto } from './dto/createTransporterDto';
import { UpdateTransporterDto } from './dto/updateTransporterDto';
import { CreatePlantCodeDto } from './dto/createPlantCodeDto';
import { UpdatePlantCodeDto } from './dto/updatePlantCodeDto';
import { CreateSalesZoneDto } from './dto/createSalesZoneDto';
import { UpdateSalesZoneDto } from './dto/updateSalesZoneDto';
import { CreatePackConfigDto } from './dto/createPackConfigDto';
import { UpdatePackConfigDto } from './dto/updatePackConfigDto';
import { CreateCustomerDto } from './dto/createCustomerDto';
import { UpdateCustomerDto } from './dto/updateCustomerDto';
import { CreatePrinterDto } from './dto/createPrinterDto';
import { UpdatePrinterDto } from './dto/updatePrinterDto';

@ApiTags('Lookup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lookup')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200 })
  getProducts() {
    return this.lookupService.getProducts();
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201 })
  createProduct(@Body() dto: CreateProductDto) {
    return this.lookupService.createProduct(dto);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateProductDto })
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.lookupService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', type: Number })
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.lookupService.deleteProduct(id);
  }

  @Get('transporters')
  @ApiOperation({ summary: 'Get all transporters' })
  getTransporters() {
    return this.lookupService.getTransporters();
  }

  @Post('transporters')
  @ApiOperation({ summary: 'Create a transporter' })
  @ApiBody({ type: CreateTransporterDto })
  createTransporter(@Body() dto: CreateTransporterDto) {
    return this.lookupService.createTransporter(dto);
  }

  @Patch('transporters/:id')
  @ApiOperation({ summary: 'Update a transporter' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateTransporterDto })
  updateTransporter(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransporterDto) {
    return this.lookupService.updateTransporter(id, dto);
  }

  @Delete('transporters/:id')
  @ApiOperation({ summary: 'Delete a transporter' })
  @ApiParam({ name: 'id', type: Number })
  deleteTransporter(@Param('id', ParseIntPipe) id: number) {
    return this.lookupService.deleteTransporter(id);
  }

  @Get('plant-codes')
  @ApiOperation({ summary: 'Get all plant codes' })
  getPlantCodes() {
    return this.lookupService.getPlantCodes();
  }

  @Post('plant-codes')
  @ApiOperation({ summary: 'Create a plant code' })
  @ApiBody({ type: CreatePlantCodeDto })
  createPlantCode(@Body() dto: CreatePlantCodeDto) {
    return this.lookupService.createPlantCode(dto);
  }

  @Patch('plant-codes/:id')
  @ApiOperation({ summary: 'Update a plant code' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePlantCodeDto })
  updatePlantCode(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlantCodeDto) {
    return this.lookupService.updatePlantCode(id, dto);
  }

  @Delete('plant-codes/:id')
  @ApiOperation({ summary: 'Delete a plant code' })
  @ApiParam({ name: 'id', type: Number })
  deletePlantCode(@Param('id', ParseIntPipe) id: number) {
    return this.lookupService.deletePlantCode(id);
  }

  @Get('sales-zones')
  @ApiOperation({ summary: 'Get all sales zones' })
  getSalesZones() {
    return this.lookupService.getSalesZones();
  }

  @Post('sales-zones')
  @ApiOperation({ summary: 'Create a sales zone' })
  @ApiBody({ type: CreateSalesZoneDto })
  createSalesZone(@Body() dto: CreateSalesZoneDto) {
    return this.lookupService.createSalesZone(dto);
  }

  @Patch('sales-zones/:id')
  @ApiOperation({ summary: 'Update a sales zone' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSalesZoneDto })
  updateSalesZone(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSalesZoneDto) {
    return this.lookupService.updateSalesZone(id, dto);
  }

  @Delete('sales-zones/:id')
  @ApiOperation({ summary: 'Delete a sales zone' })
  @ApiParam({ name: 'id', type: Number })
  deleteSalesZone(@Param('id', ParseIntPipe) id: number) {
    return this.lookupService.deleteSalesZone(id);
  }

  @Get('pack-configs')
  @ApiOperation({ summary: 'Get all pack configs' })
  getPackConfigs() {
    return this.lookupService.getPackConfigs();
  }

  @Post('pack-configs')
  @ApiOperation({ summary: 'Create a pack config' })
  @ApiBody({ type: CreatePackConfigDto })
  createPackConfig(@Body() dto: CreatePackConfigDto) {
    return this.lookupService.createPackConfig(dto);
  }

  @Patch('pack-configs/:id')
  @ApiOperation({ summary: 'Update a pack config' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePackConfigDto })
  updatePackConfig(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePackConfigDto) {
    return this.lookupService.updatePackConfig(id, dto);
  }

  @Delete('pack-configs/:id')
  @ApiOperation({ summary: 'Delete a pack config' })
  @ApiParam({ name: 'id', type: Number })
  deletePackConfig(@Param('id', ParseIntPipe) id: number) {
    return this.lookupService.deletePackConfig(id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get all customers' })
  getCustomers() {
    return this.lookupService.getCustomers();
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create a customer' })
  @ApiBody({ type: CreateCustomerDto })
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.lookupService.createCustomer(dto);
  }

  @Patch('customers/:id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCustomerDto })
  updateCustomer(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.lookupService.updateCustomer(id, dto);
  }

  @Delete('customers/:id')
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiParam({ name: 'id', type: Number })
  deleteCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.lookupService.deleteCustomer(id);
  }

  @Get('printers')
  @ApiOperation({ summary: 'Get all printers' })
  getPrinters() {
    return this.lookupService.getPrinters();
  }

  @Post('printers')
  @ApiOperation({ summary: 'Create a printer' })
  @ApiBody({ type: CreatePrinterDto })
  createPrinter(@Body() dto: CreatePrinterDto) {
    return this.lookupService.createPrinter(dto);
  }

  @Patch('printers/:id')
  @ApiOperation({ summary: 'Update a printer' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePrinterDto })
  updatePrinter(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePrinterDto) {
    return this.lookupService.updatePrinter(id, dto);
  }

  @Delete('printers/:id')
  @ApiOperation({ summary: 'Delete a printer' })
  @ApiParam({ name: 'id', type: Number })
  deletePrinter(@Param('id', ParseIntPipe) id: number) {
    return this.lookupService.deletePrinter(id);
  }
}
