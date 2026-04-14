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
  UploadedFile, 
  UseInterceptors, 
  Res,
  ParseArrayPipe,
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
  ApiConsumes,
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
import { CreateMaterialBarcodeDto } from './dto/createMaterialBarcodeDto';
import { UpdateMaterialBarcodeDto } from './dto/updateMaterialBarcodeDto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

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

  @Get('material-barcodes')
  @ApiOperation({ summary: 'Get all material barcodes' })
  getMaterialBarcodes() {
    return this.lookupService.getMaterialBarcodes();
  }

  @Post('material-barcodes')
  @ApiOperation({ summary: 'Create a material barcode' })
  @ApiBody({ type: CreateMaterialBarcodeDto })
  createMaterialBarcode(@Body() dto: CreateMaterialBarcodeDto) {
    return this.lookupService.createMaterialBarcode(dto);
  }

  @Patch('material-barcodes/:id')
  @ApiOperation({ summary: 'Update a material barcode' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateMaterialBarcodeDto })
  updateMaterialBarcode(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaterialBarcodeDto) {
    return this.lookupService.updateMaterialBarcode(id, dto);
  }

  @Delete('material-barcodes/:id')
  @ApiOperation({ summary: 'Delete a material barcode' })
  @ApiParam({ name: 'id', type: Number })
  deleteMaterialBarcode(@Param('id', ParseIntPipe) id: number) {
    return this.lookupService.deleteMaterialBarcode(id);
  }

  @Get('bulk-template')
  @ApiOperation({ summary: 'Download Excel template with all master data' })
  async downloadBulkTemplate(@Res() res: Response) {
    return this.lookupService.generateBulkTemplate(res);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import/update master data from Excel' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async bulkImport(@UploadedFile() file: Express.Multer.File) {
    return this.lookupService.processBulkImport(file);
  }

  @Post('mobile-sync/material-barcodes')
  @ApiOperation({ summary: 'Sync Material Barcodes from Mobile App (Upsert)' })
  @ApiBody({ type: [CreateMaterialBarcodeDto] })
  @ApiResponse({ status: 201, description: 'Records synced successfully' })
  async syncMaterialBarcodes(
    @Body(new ParseArrayPipe({ items: CreateMaterialBarcodeDto })) 
    dtos: CreateMaterialBarcodeDto[]
  ) {
    return this.lookupService.syncMaterialBarcodes(dtos);
  }

  @Get('config/:key')
  @ApiOperation({ summary: 'Get system config by key' })
  getConfig(@Param('key') key: string) {
    return this.lookupService.getSystemConfig(key);
  }

  @Patch('config/:key')
  @ApiOperation({ summary: 'Update system config by key' })
  @ApiBody({ schema: { properties: { value: { type: 'string' } } } })
  updateConfig(@Param('key') key: string, @Body('value') value: string) {
    return this.lookupService.upsertSystemConfig(key, value);
  }
}
