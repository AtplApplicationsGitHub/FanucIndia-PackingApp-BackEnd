import { Injectable, BadRequestException  } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class LookupService {
  constructor(private prisma: PrismaService) {}

  getProducts() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }
  createProduct(dto: { name: string; code: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    if (!dto.code || !dto.code.trim()) throw new Error('Code is required');
    return this.prisma.product.create({
      data: { name: dto.name.trim(), code: dto.code.trim() },
    });
  }
  updateProduct(id: number, dto: { name: string; code: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    if (!dto.code || !dto.code.trim()) throw new Error('Code is required');
    return this.prisma.product.update({
      where: { id },
      data: { name: dto.name.trim(), code: dto.code.trim() },
    });
  }
  async deleteProduct(id: number) {
    const usageCount = await this.prisma.salesOrder.count({
      where: { productId: id }
    });
    if (usageCount > 0) {
      throw new BadRequestException(
        'Cannot delete: This product is used in one or more orders.'
      );
    }
    return this.prisma.product.delete({ where: { id } });
  }

  getTransporters() {
    return this.prisma.transporter.findMany({ orderBy: { name: 'asc' } });
  }
  createTransporter(dto: { name: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    return this.prisma.transporter.create({ data: { name: dto.name.trim() } });
  }
  updateTransporter(id: number, dto: { name: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    return this.prisma.transporter.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
  }
  deleteTransporter(id: number) {
    return this.prisma.transporter.delete({ where: { id } });
  }

  getPlantCodes() {
    return this.prisma.plantCode.findMany({ orderBy: { code: 'asc' } });
  }
  createPlantCode(dto: { code: string; description: string }) {
    if (!dto.code || !dto.code.trim()) throw new Error('Code is required');
    if (!dto.description || !dto.description.trim())
      throw new Error('Description is required');
    return this.prisma.plantCode.create({
      data: { code: dto.code.trim(), description: dto.description.trim() },
    });
  }
  updatePlantCode(id: number, dto: { code: string; description: string }) {
    if (!dto.code || !dto.code.trim()) throw new Error('Code is required');
    if (!dto.description || !dto.description.trim())
      throw new Error('Description is required');
    return this.prisma.plantCode.update({
      where: { id },
      data: { code: dto.code.trim(), description: dto.description.trim() },
    });
  }
  deletePlantCode(id: number) {
    return this.prisma.plantCode.delete({ where: { id } });
  }

  getSalesZones() {
    return this.prisma.salesZone.findMany({ orderBy: { name: 'asc' } });
  }
  createSalesZone(dto: { name: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    return this.prisma.salesZone.create({ data: { name: dto.name.trim() } });
  }
  updateSalesZone(id: number, dto: { name: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    return this.prisma.salesZone.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
  }
  deleteSalesZone(id: number) {
    return this.prisma.salesZone.delete({ where: { id } });
  }

  getPackConfigs() {
    return this.prisma.packConfig.findMany({ orderBy: { configName: 'asc' } });
  }
  createPackConfig(dto: { configName: string }) {
    if (!dto.configName || !dto.configName.trim())
      throw new Error('Config Name is required');
    return this.prisma.packConfig.create({
      data: { configName: dto.configName.trim() },
    });
  }
  updatePackConfig(id: number, dto: { configName: string }) {
    if (!dto.configName || !dto.configName.trim())
      throw new Error('Config Name is required');
    return this.prisma.packConfig.update({
      where: { id },
      data: { configName: dto.configName.trim() },
    });
  }
  deletePackConfig(id: number) {
    return this.prisma.packConfig.delete({ where: { id } });
  }

  getTerminals() {
    return this.prisma.terminal.findMany({ orderBy: { name: 'asc' } });
  }
  createTerminal(dto: { name: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    return this.prisma.terminal.create({ data: { name: dto.name.trim() } });
  }
  updateTerminal(id: number, dto: { name: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    return this.prisma.terminal.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
  }
  deleteTerminal(id: number) {
    return this.prisma.terminal.delete({ where: { id } });
  }

  getCustomers() {
    return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
  }
  createCustomer(dto: { name: string; address: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    if (!dto.address || !dto.address.trim())
      throw new Error('Address is required');
    return this.prisma.customer.create({
      data: { name: dto.name.trim(), address: dto.address.trim() },
    });
  }
  updateCustomer(id: number, dto: { name: string; address: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    if (!dto.address || !dto.address.trim())
      throw new Error('Address is required');
    return this.prisma.customer.update({
      where: { id },
      data: { name: dto.name.trim(), address: dto.address.trim() },
    });
  }
  deleteCustomer(id: number) {
    return this.prisma.customer.delete({ where: { id } });
  }

  getPrinters() {
    return this.prisma.printer.findMany({ orderBy: { name: 'asc' } });
  }
  createPrinter(dto: { name: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    return this.prisma.printer.create({ data: { name: dto.name.trim() } });
  }
  updatePrinter(id: number, dto: { name: string }) {
    if (!dto.name || !dto.name.trim()) throw new Error('Name is required');
    return this.prisma.printer.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
  }
  deletePrinter(id: number) {
    return this.prisma.printer.delete({ where: { id } });
  }
}
