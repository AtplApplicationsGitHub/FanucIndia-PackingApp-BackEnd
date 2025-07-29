import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BadRequestException } from '@nestjs/common';

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

  async deleteProduct(id: number) {
    try {
      return await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      console.error('Delete error:', error);
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete product: One or more orders depend on this product.'
        );
      }
      throw error;
    }
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

  async deleteTransporter(id: number) {
    try {
      return await this.prisma.transporter.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete transporter: One or more orders depend on this transporter.'
        );
      }
      throw error;
    }
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

  async deletePlantCode(id: number) {
    try {
      return await this.prisma.plantCode.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete plant code: One or more orders depend on this plant code.'
        );
      }
      throw error;
    }
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

  async deleteSalesZone(id: number) {
    try {
      return await this.prisma.salesZone.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete sales zone: One or more orders depend on this sales zone.'
        );
      }
      throw error;
    }
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

  async deletePackConfig(id: number) {
    try {
      return await this.prisma.packConfig.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete packing configuration: One or more orders depend on this value.'
        );
      }
      throw error;
    }
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

  async deleteTerminal(id: number) {
    try {
      return await this.prisma.terminal.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete terminal: One or more orders depend on this terminal.'
        );
      }
      throw error;
    }
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

  async deleteCustomer(id: number) {
    try {
      return await this.prisma.customer.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete customer: One or more orders depend on this customer.'
        );
      }
      throw error;
    }
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

  async deletePrinter(id: number) {
    try {
      return await this.prisma.printer.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete printer: One or more entities depend on this printer.'
        );
      }
      throw error;
    }
  }
}
