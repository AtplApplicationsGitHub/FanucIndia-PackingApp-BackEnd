import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

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
import { CreateTerminalDto } from './dto/createTerminalDto';
import { UpdateTerminalDto } from './dto/updateTerminalDto';
import { CreateCustomerDto } from './dto/createCustomerDto';
import { UpdateCustomerDto } from './dto/updateCustomerDto';
import { CreatePrinterDto } from './dto/createPrinterDto';
import { UpdatePrinterDto } from './dto/updatePrinterDto';

@Injectable()
export class LookupService {
  constructor(private prisma: PrismaService) {}

  // PRODUCTS
  getProducts() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  updateProduct(id: number, dto: UpdateProductDto) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  deleteProduct(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }

  // TRANSPORTERS
  getTransporters() {
    return this.prisma.transporter.findMany({ orderBy: { name: 'asc' } });
  }

  createTransporter(dto: CreateTransporterDto) {
    return this.prisma.transporter.create({ data: dto });
  }

  updateTransporter(id: number, dto: UpdateTransporterDto) {
    return this.prisma.transporter.update({ where: { id }, data: dto });
  }

  deleteTransporter(id: number) {
    return this.prisma.transporter.delete({ where: { id } });
  }

  // PLANT CODES
  getPlantCodes() {
    return this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } });
  }

  createPlantCode(dto: CreatePlantCodeDto) {
    return this.prisma.plantCode.create({ data: dto });
  }

  updatePlantCode(id: number, dto: UpdatePlantCodeDto) {
    return this.prisma.plantCode.update({ where: { id }, data: dto });
  }

  deletePlantCode(id: number) {
    return this.prisma.plantCode.delete({ where: { id } });
  }

  // SALES ZONES
  getSalesZones() {
    return this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } });
  }

  createSalesZone(dto: CreateSalesZoneDto) {
    return this.prisma.salesZone.create({ data: dto });
  }

  updateSalesZone(id: number, dto: UpdateSalesZoneDto) {
    return this.prisma.salesZone.update({ where: { id }, data: dto });
  }

  deleteSalesZone(id: number) {
    return this.prisma.salesZone.delete({ where: { id } });
  }

  // PACK CONFIGS
  getPackConfigs() {
    return this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } });
  }

  createPackConfig(dto: CreatePackConfigDto) {
    return this.prisma.packConfig.create({ data: dto });
  }

  updatePackConfig(id: number, dto: UpdatePackConfigDto) {
    return this.prisma.packConfig.update({ where: { id }, data: dto });
  }

  deletePackConfig(id: number) {
    return this.prisma.packConfig.delete({ where: { id } });
  }

  // TERMINALS
  getTerminals() {
    return this.prisma.terminal.findMany({ orderBy: { name: 'asc' } });
  }

  createTerminal(dto: CreateTerminalDto) {
    return this.prisma.terminal.create({ data: dto });
  }

  updateTerminal(id: number, dto: UpdateTerminalDto) {
    return this.prisma.terminal.update({ where: { id }, data: dto });
  }

  deleteTerminal(id: number) {
    return this.prisma.terminal.delete({ where: { id } });
  }

  // CUSTOMERS
  getCustomers() {
    return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
  }

  createCustomer(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  updateCustomer(id: number, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  deleteCustomer(id: number) {
    return this.prisma.customer.delete({ where: { id } });
  }

  // PRINTERS
  getPrinters() {
    return this.prisma.printer.findMany({ orderBy: { name: 'asc' } });
  }

  createPrinter(dto: CreatePrinterDto) {
    return this.prisma.printer.create({ data: dto });
  }

  updatePrinter(id: number, dto: UpdatePrinterDto) {
    return this.prisma.printer.update({ where: { id }, data: dto });
  }

  deletePrinter(id: number) {
    return this.prisma.printer.delete({ where: { id } });
  }
}
