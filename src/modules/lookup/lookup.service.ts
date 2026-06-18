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
import { CreateCustomerDto } from './dto/createCustomerDto';
import { UpdateCustomerDto } from './dto/updateCustomerDto';
import { CreatePrinterDto } from './dto/createPrinterDto';
import { UpdatePrinterDto } from './dto/updatePrinterDto';
import { CreateMaterialBarcodeDto } from './dto/createMaterialBarcodeDto';
import { UpdateMaterialBarcodeDto } from './dto/updateMaterialBarcodeDto';
import { Workbook } from 'exceljs';
import { Response } from 'express';

@Injectable()
export class LookupService {
  constructor(private prisma: PrismaService) {}

  getProducts() {
    return this.prisma.product.findMany({ orderBy: { id: 'asc' } });
  }

  async createProduct(dto: CreateProductDto) {
    const normalizedName = dto.name.trim().replace(/\s+/g, ' ');

    const existing = await this.prisma.product.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing)
      throw new BadRequestException(
        `Product "${normalizedName}" already exists.`,
      );

    return this.prisma.product.create({
      data: { ...dto, name: normalizedName },
    });
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    if (dto.name) {
      const normalizedName = dto.name.trim().replace(/\s+/g, ' ');
      const existing = await this.prisma.product.findFirst({
        where: {
          name: { equals: normalizedName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing)
        throw new BadRequestException(
          `Product "${normalizedName}" already exists.`,
        );
      dto.name = normalizedName;
    }
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async deleteProduct(id: number) {
    try {
      return await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      console.error('Delete error:', error);
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete product: One or more orders depend on this product.',
        );
      }
      throw error;
    }
  }

  getTransporters() {
    return this.prisma.transporter.findMany({ orderBy: { id: 'asc' } });
  }

  async createTransporter(dto: CreateTransporterDto) {
    const normalizedName = dto.name.trim().replace(/\s+/g, ' ');

    const existing = await this.prisma.transporter.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing)
      throw new BadRequestException(
        `Transporter "${normalizedName}" already exists.`,
      );

    return this.prisma.transporter.create({
      data: { ...dto, name: normalizedName },
    });
  }

  async updateTransporter(id: number, dto: UpdateTransporterDto) {
    if (dto.name) {
      const normalizedName = dto.name.trim().replace(/\s+/g, ' ');
      const existing = await this.prisma.transporter.findFirst({
        where: {
          name: { equals: normalizedName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing)
        throw new BadRequestException(
          `Transporter "${normalizedName}" already exists.`,
        );
      dto.name = normalizedName;
    }
    return this.prisma.transporter.update({ where: { id }, data: dto });
  }

  async deleteTransporter(id: number) {
    try {
      return await this.prisma.transporter.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete transporter: One or more orders depend on this transporter.',
        );
      }
      throw error;
    }
  }

  getPlantCodes() {
    return this.prisma.plantCode.findMany({ orderBy: { id: 'asc' } });
  }

  async createPlantCode(dto: CreatePlantCodeDto) {
    const existing = await this.prisma.plantCode.findFirst({
      where: { code: { equals: dto.code, mode: 'insensitive' } },
    });
    if (existing)
      throw new BadRequestException(`Plant Code "${dto.code}" already exists.`);

    return this.prisma.plantCode.create({ data: dto });
  }

  async updatePlantCode(id: number, dto: UpdatePlantCodeDto) {
    if (dto.code) {
      const existing = await this.prisma.plantCode.findFirst({
        where: {
          code: { equals: dto.code, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing)
        throw new BadRequestException(
          `Plant Code "${dto.code}" already exists.`,
        );
    }
    return this.prisma.plantCode.update({ where: { id }, data: dto });
  }

  async deletePlantCode(id: number) {
    try {
      return await this.prisma.plantCode.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete plant code: One or more orders depend on this plant code.',
        );
      }
      throw error;
    }
  }

  getSalesZones() {
    return this.prisma.salesZone.findMany({ orderBy: { id: 'asc' } });
  }

  async createSalesZone(dto: CreateSalesZoneDto) {
    const normalizedName = dto.name.trim().replace(/\s+/g, ' ');

    const existing = await this.prisma.salesZone.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing)
      throw new BadRequestException(
        `Sales Zone "${normalizedName}" already exists.`,
      );

    return this.prisma.salesZone.create({
      data: { ...dto, name: normalizedName },
    });
  }

  async updateSalesZone(id: number, dto: UpdateSalesZoneDto) {
    if (dto.name) {
      const normalizedName = dto.name.trim().replace(/\s+/g, ' ');
      const existing = await this.prisma.salesZone.findFirst({
        where: {
          name: { equals: normalizedName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing)
        throw new BadRequestException(
          `Sales Zone "${normalizedName}" already exists.`,
        );
      dto.name = normalizedName;
    }
    return this.prisma.salesZone.update({ where: { id }, data: dto });
  }

  async deleteSalesZone(id: number) {
    try {
      return await this.prisma.salesZone.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete sales zone: One or more orders depend on this sales zone.',
        );
      }
      throw error;
    }
  }

  getPackConfigs() {
    return this.prisma.packConfig.findMany({ orderBy: { id: 'asc' } });
  }

  async createPackConfig(dto: CreatePackConfigDto) {
    const normalizedConfigName = dto.configName.trim().replace(/\s+/g, ' ');

    const existing = await this.prisma.packConfig.findFirst({
      where: {
        configName: { equals: normalizedConfigName, mode: 'insensitive' },
      },
    });
    if (existing)
      throw new BadRequestException(
        `Pack Config "${normalizedConfigName}" already exists.`,
      );

    return this.prisma.packConfig.create({
      data: { ...dto, configName: normalizedConfigName },
    });
  }

  async updatePackConfig(id: number, dto: UpdatePackConfigDto) {
    if (dto.configName) {
      const normalizedConfigName = dto.configName.trim().replace(/\s+/g, ' ');
      const existing = await this.prisma.packConfig.findFirst({
        where: {
          configName: { equals: normalizedConfigName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing)
        throw new BadRequestException(
          `Pack Config "${normalizedConfigName}" already exists.`,
        );
      dto.configName = normalizedConfigName;
    }
    return this.prisma.packConfig.update({ where: { id }, data: dto });
  }

  async deletePackConfig(id: number) {
    try {
      return await this.prisma.packConfig.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete packing configuration: One or more orders depend on this value.',
        );
      }
      throw error;
    }
  }

  getCustomers() {
    return this.prisma.customer.findMany({ orderBy: { id: 'asc' } });
  }

  async createCustomer(dto: CreateCustomerDto) {
    const normalizedName = dto.name.trim().replace(/\s+/g, ' ');
    const normalizedAddress = dto.address
      ? dto.address.trim().replace(/\s+/g, ' ')
      : undefined;
    const normalizedContactNumber = dto.contactNumber
      ? dto.contactNumber.trim().replace(/\s+/g, ' ')
      : undefined;

    const existing = await this.prisma.customer.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
        address: normalizedAddress
          ? { equals: normalizedAddress, mode: 'insensitive' }
          : null,
      },
    });

    if (existing) {
      const location = normalizedAddress ? ` at ${normalizedAddress}` : '';
      throw new BadRequestException(
        `Customer "${normalizedName}"${location} already exists.`,
      );
    }

    return this.prisma.customer.create({
      data: {
        ...dto,
        name: normalizedName,
        address: normalizedAddress,
        contactNumber: normalizedContactNumber,
      },
    });
  }

  async updateCustomer(id: number, dto: UpdateCustomerDto) {
    const currentCustomer = await this.prisma.customer.findUnique({
      where: { id },
    });
    if (!currentCustomer) {
      throw new BadRequestException(`Customer not found.`);
    }

    const normalizedName =
      dto.name !== undefined
        ? dto.name.trim().replace(/\s+/g, ' ')
        : currentCustomer.name;

    const normalizedAddress =
      dto.address !== undefined
        ? dto.address
          ? dto.address.trim().replace(/\s+/g, ' ')
          : null
        : currentCustomer.address;

    const normalizedContactNumber =
      dto.contactNumber !== undefined
        ? dto.contactNumber
          ? dto.contactNumber.trim().replace(/\s+/g, ' ')
          : null
        : currentCustomer.contactNumber;

    const existing = await this.prisma.customer.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' },
        address: normalizedAddress
          ? { equals: normalizedAddress, mode: 'insensitive' }
          : null,
        id: { not: id },
      },
    });

    if (existing) {
      const location = normalizedAddress ? ` at ${normalizedAddress}` : '';
      throw new BadRequestException(
        `Customer "${normalizedName}"${location} already exists.`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.name !== undefined && { name: normalizedName }),
          ...(dto.address !== undefined && { address: normalizedAddress }),
          ...(dto.contactNumber !== undefined && {
            contactNumber: normalizedContactNumber,
          }),
        },
      });

      if (dto.address !== undefined) {
        await tx.salesOrder.updateMany({
          where: { customerId: id },
          data: { address: normalizedAddress },
        });
      }

      return updatedCustomer;
    });
  }

  async deleteCustomer(id: number) {
    try {
      return await this.prisma.customer.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete customer: One or more orders depend on this customer.',
        );
      }
      throw error;
    }
  }

  getPrinters() {
    return this.prisma.printer.findMany({ orderBy: { id: 'asc' } });
  }

  async createPrinter(dto: CreatePrinterDto) {
    const normalizedName = dto.name.trim().replace(/\s+/g, ' ');

    const existing = await this.prisma.printer.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing)
      throw new BadRequestException(
        `Printer "${normalizedName}" already exists.`,
      );

    return this.prisma.printer.create({
      data: { ...dto, name: normalizedName },
    });
  }

  async updatePrinter(id: number, dto: UpdatePrinterDto) {
    if (dto.name) {
      const normalizedName = dto.name.trim().replace(/\s+/g, ' ');
      const existing = await this.prisma.printer.findFirst({
        where: {
          name: { equals: normalizedName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing)
        throw new BadRequestException(
          `Printer "${normalizedName}" already exists.`,
        );
      dto.name = normalizedName;
    }
    return this.prisma.printer.update({ where: { id }, data: dto });
  }

  async deletePrinter(id: number) {
    try {
      return await this.prisma.printer.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete printer: One or more entities depend on this printer.',
        );
      }
      throw error;
    }
  }

  getMaterialBarcodes() {
    return this.prisma.materialBarcode.findMany({ orderBy: { id: 'asc' } });
  }

  async createMaterialBarcode(dto: CreateMaterialBarcodeDto) {
    const existing = await this.prisma.materialBarcode.findFirst({
      where: { erpCode: dto.erpCode },
    });

    if (existing) {
      throw new BadRequestException(
        `Material Barcode with ERP Code "${dto.erpCode}" already exists.`,
      );
    }

    return this.prisma.materialBarcode.create({ data: dto });
  }

  async updateMaterialBarcode(id: number, dto: UpdateMaterialBarcodeDto) {
    if (dto.erpCode) {
      const existing = await this.prisma.materialBarcode.findFirst({
        where: {
          erpCode: dto.erpCode,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Material Barcode with ERP Code "${dto.erpCode}" already exists.`,
        );
      }
    }

    return this.prisma.materialBarcode.update({ where: { id }, data: dto });
  }

  async deleteMaterialBarcode(id: number) {
    return await this.prisma.materialBarcode.delete({ where: { id } });
  }

  async generateBulkTemplate(res: Response, type?: string) {
    const workbook = new Workbook();

    const sheets = [
      {
        name: 'Products',
        data: await this.getProducts(),
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
        ],
      },
      {
        name: 'Transporters',
        data: await this.getTransporters(),
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
        ],
      },
      {
        name: 'Plant Codes',
        data: await this.getPlantCodes(),
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Code', key: 'code', width: 15 },
          { header: 'Description', key: 'description', width: 30 },
        ],
      },
      {
        name: 'Sales Zones',
        data: await this.getSalesZones(),
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
        ],
      },
      {
        name: 'Packing Configs',
        data: await this.getPackConfigs(),
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Config Name', key: 'configName', width: 30 },
        ],
      },
      {
        name: 'Customers',
        data: await this.getCustomers(),
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Address', key: 'address', width: 40 },
          { header: 'Contact Number', key: 'contactNumber', width: 20 },
        ],
      },
      {
        name: 'Printers',
        data: await this.getPrinters(),
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
        ],
      },
      {
        name: 'Material Barcodes',
        data: await this.getMaterialBarcodes(),
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'ERP Code', key: 'erpCode', width: 20 },
          { header: 'Mapping Barcode', key: 'mappingBarcode', width: 20 },
          { header: 'Group', key: 'group', width: 15 },
          {
            header: 'Accept Bulk Data (True/False)',
            key: 'acceptBulkData',
            width: 25,
          },
          {
            header: 'Remarks Required (True/False)',
            key: 'remarksRequired',
            width: 25,
          },
          { header: 'Classification', key: 'classification', width: 20 },
        ],
      },
    ];

    const sheetsToRender = type
      ? sheets.filter((s) => s.name === type)
      : sheets;

    for (const sheetDef of sheetsToRender) {
      const sheet = workbook.addWorksheet(sheetDef.name);
      sheet.columns = sheetDef.columns;
      sheet.addRows(sheetDef.data);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${type ? type + '_data' : 'master_data_bulk'}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  async processBulkImport(file: Express.Multer.File) {
    const workbook = new Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const results: string[] = [];

    const getVal = (row, colIdx) => {
      const val = row.getCell(colIdx).value;

      if (val === null || val === undefined) return null;

      if (typeof val === 'string' || typeof val === 'number') {
        const s = String(val).trim();
        return s || null;
      }

      if (
        typeof val === 'object' &&
        'richText' in val &&
        Array.isArray((val as any).richText)
      ) {
        const s = (val as any).richText
          .map((part: any) => part.text || '')
          .join('')
          .trim();
        return s || null;
      }

      if (typeof val === 'object' && 'text' in val) {
        const s = String((val as any).text).trim();
        return s || null;
      }

      if (typeof val === 'object' && 'result' in val) {
        const result = (val as any).result;
        if (result === null || result === undefined) return null;
        const s = String(result).trim();
        return s || null;
      }

      if (val instanceof Date) {
        return val.toISOString();
      }

      const s = String(val).trim();
      return s || null;
    };

    const getBool = (row, colIdx) => {
      const raw = row.getCell(colIdx).value;
      if (typeof raw === 'boolean') return raw;

      const val = getVal(row, colIdx);
      if (!val) return false;

      const s = val.toLowerCase().trim();
      return s === 'true' || s === 'yes' || s === '1';
    };

    // Helper to extract rows to avoid async issues inside .eachRow
    const extractRows = (sheet) => {
      const rows: any[] = [];
      if (sheet) {
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) rows.push(row);
        });
      }
      return rows;
    };

    await this.prisma.$transaction(
      async (tx) => {
        const promises: Promise<any>[] = [];

        // 1. Products
        const productSheet = workbook.getWorksheet('Products');
        if (productSheet) {
          const rows = extractRows(productSheet);
          const uniqueItems = new Map();

          for (const row of rows) {
            const id = row.getCell(1).value
              ? Number(row.getCell(1).value)
              : null;
            const rawName = getVal(row, 2);
            const name = rawName ? rawName.trim().replace(/\s+/g, ' ') : null;
            if (name) {
              const key = name.toLowerCase();
              if (!uniqueItems.has(key) || (id && !uniqueItems.get(key).id)) {
                uniqueItems.set(key, { id, name });
              }
            }
          }

          for (const item of uniqueItems.values()) {
            const { id, name } = item;
            if (id) {
              promises.push(
                tx.product
                  .update({ where: { id }, data: { name } })
                  .catch(() => {}),
              );
            } else {
              promises.push(
                (async () => {
                  const existing = await tx.product.findFirst({
                    where: { name: { equals: name, mode: 'insensitive' } },
                  });
                  if (!existing) await tx.product.create({ data: { name } });
                })().catch(() => {}),
              );
            }
          }
          results.push('Products processed');
        }

        // 2. Transporters
        const transpSheet = workbook.getWorksheet('Transporters');
        if (transpSheet) {
          const rows = extractRows(transpSheet);
          const uniqueItems = new Map();

          for (const row of rows) {
            const id = row.getCell(1).value
              ? Number(row.getCell(1).value)
              : null;
            const rawName = getVal(row, 2);
            const name = rawName ? rawName.trim().replace(/\s+/g, ' ') : null;
            if (name) {
              const key = name.toLowerCase();
              if (!uniqueItems.has(key) || (id && !uniqueItems.get(key).id)) {
                uniqueItems.set(key, { id, name });
              }
            }
          }

          for (const item of uniqueItems.values()) {
            const { id, name } = item;
            if (id) {
              promises.push(
                tx.transporter
                  .update({ where: { id }, data: { name } })
                  .catch(() => {}),
              );
            } else {
              promises.push(
                (async () => {
                  const existing = await tx.transporter.findFirst({
                    where: { name: { equals: name, mode: 'insensitive' } },
                  });
                  if (!existing)
                    await tx.transporter.create({ data: { name } });
                })().catch(() => {}),
              );
            }
          }
          results.push('Transporters processed');
        }

        // 3. Plant Codes
        const plantSheet = workbook.getWorksheet('Plant Codes');
        if (plantSheet) {
          const rows = extractRows(plantSheet);
          const uniqueItems = new Map();

          for (const row of rows) {
            const id = row.getCell(1).value
              ? Number(row.getCell(1).value)
              : null;
            const rawCode = getVal(row, 2);
            const code = rawCode ? rawCode.trim().replace(/\s+/g, ' ') : null;
            const rawDescription = getVal(row, 3) || '';
            const description = rawDescription.trim().replace(/\s+/g, ' ');
            if (code) {
              const key = code.toLowerCase();
              if (!uniqueItems.has(key) || (id && !uniqueItems.get(key).id)) {
                uniqueItems.set(key, { id, code, description });
              }
            }
          }

          for (const item of uniqueItems.values()) {
            const { id, code, description } = item;
            if (id) {
              promises.push(
                tx.plantCode
                  .update({ where: { id }, data: { code, description } })
                  .catch(() => {}),
              );
            } else {
              promises.push(
                (async () => {
                  const existing = await tx.plantCode.findFirst({
                    where: { code: { equals: code, mode: 'insensitive' } },
                  });
                  if (!existing)
                    await tx.plantCode.create({ data: { code, description } });
                })().catch(() => {}),
              );
            }
          }
          results.push('Plant Codes processed');
        }

        // 4. Sales Zones
        const zoneSheet = workbook.getWorksheet('Sales Zones');
        if (zoneSheet) {
          const rows = extractRows(zoneSheet);
          const uniqueItems = new Map();

          for (const row of rows) {
            const id = row.getCell(1).value
              ? Number(row.getCell(1).value)
              : null;
            const rawName = getVal(row, 2);
            const name = rawName ? rawName.trim().replace(/\s+/g, ' ') : null;
            if (name) {
              const key = name.toLowerCase();
              if (!uniqueItems.has(key) || (id && !uniqueItems.get(key).id)) {
                uniqueItems.set(key, { id, name });
              }
            }
          }

          for (const item of uniqueItems.values()) {
            const { id, name } = item;
            if (id) {
              promises.push(
                tx.salesZone
                  .update({ where: { id }, data: { name } })
                  .catch(() => {}),
              );
            } else {
              promises.push(
                (async () => {
                  const existing = await tx.salesZone.findFirst({
                    where: { name: { equals: name, mode: 'insensitive' } },
                  });
                  if (!existing) await tx.salesZone.create({ data: { name } });
                })().catch(() => {}),
              );
            }
          }
          results.push('Sales Zones processed');
        }

        // 5. Packing Configs
        const packSheet = workbook.getWorksheet('Packing Configs');
        if (packSheet) {
          const rows = extractRows(packSheet);
          const uniqueItems = new Map();

          for (const row of rows) {
            const id = row.getCell(1).value
              ? Number(row.getCell(1).value)
              : null;
            const rawConfigName = getVal(row, 2);
            const configName = rawConfigName
              ? rawConfigName.trim().replace(/\s+/g, ' ')
              : null;
            if (configName) {
              const key = configName.toLowerCase();
              if (!uniqueItems.has(key) || (id && !uniqueItems.get(key).id)) {
                uniqueItems.set(key, { id, configName });
              }
            }
          }

          for (const item of uniqueItems.values()) {
            const { id, configName } = item;
            if (id) {
              promises.push(
                tx.packConfig
                  .update({ where: { id }, data: { configName } })
                  .catch(() => {}),
              );
            } else {
              promises.push(
                (async () => {
                  const existing = await tx.packConfig.findFirst({
                    where: {
                      configName: { equals: configName, mode: 'insensitive' },
                    },
                  });
                  if (!existing)
                    await tx.packConfig.create({ data: { configName } });
                })().catch(() => {}),
              );
            }
          }
          results.push('Packing Configs processed');
        }

        // 6. Customers
        const custSheet = workbook.getWorksheet('Customers');
        if (custSheet) {
          const rows = extractRows(custSheet);
          const uniqueItems = new Map();

          for (const row of rows) {
            const id = row.getCell(1).value
              ? Number(row.getCell(1).value)
              : null;

            const rawName = getVal(row, 2);
            const rawAddress = getVal(row, 3) || '';
            const rawContactNumber = getVal(row, 4);

            if (rawName) {
              const name = rawName.trim().replace(/\s+/g, ' ');
              const address = rawAddress
                ? rawAddress.trim().replace(/\s+/g, ' ')
                : '';
              const contactNumber = rawContactNumber
                ? rawContactNumber.trim().replace(/\s+/g, ' ')
                : null;

              const key = `${name.toLowerCase()}_${address.toLowerCase()}`;

              if (!uniqueItems.has(key) || (id && !uniqueItems.get(key).id)) {
                uniqueItems.set(key, { id, name, address, contactNumber });
              }
            }
          }

          for (const item of uniqueItems.values()) {
            const { id, name, address, contactNumber } = item;
            const data = { name, address, contactNumber };

            if (id) {
              promises.push(
                tx.customer
                  .update({ where: { id }, data })
                  .then(() => {
                    return tx.salesOrder.updateMany({
                      where: { customerId: id },
                      data: { address: data.address },
                    });
                  })
                  .catch(() => {}),
              );
            }
          }
          results.push('Customers processed');
        }

        // 7. Printers
        const printSheet = workbook.getWorksheet('Printers');
        if (printSheet) {
          const rows = extractRows(printSheet);
          const uniqueItems = new Map();

          for (const row of rows) {
            const id = row.getCell(1).value
              ? Number(row.getCell(1).value)
              : null;
            const rawName = getVal(row, 2);
            const name = rawName ? rawName.trim().replace(/\s+/g, ' ') : null;
            if (name) {
              const key = name.toLowerCase();
              if (!uniqueItems.has(key) || (id && !uniqueItems.get(key).id)) {
                uniqueItems.set(key, { id, name });
              }
            }
          }

          for (const item of uniqueItems.values()) {
            const { id, name } = item;
            if (id) {
              promises.push(
                tx.printer
                  .update({ where: { id }, data: { name } })
                  .catch(() => {}),
              );
            } else {
              promises.push(
                (async () => {
                  const existing = await tx.printer.findFirst({
                    where: { name: { equals: name, mode: 'insensitive' } },
                  });
                  if (!existing) await tx.printer.create({ data: { name } });
                })().catch(() => {}),
              );
            }
          }
          results.push('Printers processed');
        }

        // 8. Material Barcodes
        const matSheet = workbook.getWorksheet('Material Barcodes');
        if (matSheet) {
          const rows = extractRows(matSheet);
          const uniqueItems = new Map();

          for (const row of rows) {
            const id = row.getCell(1).value
              ? Number(row.getCell(1).value)
              : null;
            const erpCode = getVal(row, 2);
            const mappingBarcode = getVal(row, 3);
            const group = getVal(row, 4);
            const acceptBulkData = getBool(row, 5);
            const remarksRequired = getBool(row, 6);
            const classification = getVal(row, 7);

            if (erpCode) {
              const key = erpCode.toLowerCase();
              if (!uniqueItems.has(key) || (id && !uniqueItems.get(key).id)) {
                uniqueItems.set(key, {
                  id,
                  erpCode,
                  mappingBarcode,
                  group,
                  acceptBulkData,
                  remarksRequired,
                  classification,
                });
              }
            }
          }

          const newBarcodesData: any[] = [];
          for (const item of uniqueItems.values()) {
            const {
              id,
              erpCode,
              mappingBarcode,
              group,
              acceptBulkData,
              remarksRequired,
              classification,
            } = item;
            const data = {
              erpCode,
              mappingBarcode,
              group,
              acceptBulkData,
              remarksRequired,
              classification,
            };

            if (id) {
              promises.push(
                tx.materialBarcode
                  .update({ where: { id }, data })
                  .catch((err) => {
                    console.error(
                      `Failed to update MaterialBarcode ID ${id}:`,
                      err.message,
                    );
                  }),
              );
            } else {
              newBarcodesData.push(data);
            }
          }

          if (newBarcodesData.length > 0) {
            promises.push(
              tx.materialBarcode
                .createMany({
                  data: newBarcodesData,
                  skipDuplicates: true, // Prisma handles exact duplicates natively here
                })
                .catch((err) => {
                  console.error(
                    'Failed to bulk insert Material Barcodes:',
                    err,
                  );
                  throw new BadRequestException(
                    'Bulk import failed for new Material Barcodes. Check logs for details.',
                  );
                }),
            );
          }

          results.push('Material Barcodes processed');
        }

        await Promise.all(promises);
      },
      {
        timeout: 120000,
      },
    );

    return { message: 'Bulk import completed successfully', details: results };
  }

  async syncMaterialBarcodes(dtos: CreateMaterialBarcodeDto[]) {
    const results: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const dto of dtos) {
        const data = {
          erpCode: dto.erpCode,
          mappingBarcode: dto.mappingBarcode,
          group: dto.group,
          acceptBulkData: dto.acceptBulkData ?? false,
          remarksRequired: dto.remarksRequired ?? false,
          classification: dto.classification,
        };

        const result = await tx.materialBarcode.upsert({
          where: { erpCode: dto.erpCode },
          update: {
            mappingBarcode: data.mappingBarcode,
            group: data.group,
            acceptBulkData: data.acceptBulkData,
            remarksRequired: data.remarksRequired,
            classification: data.classification,
          },
          create: {
            erpCode: data.erpCode,
            mappingBarcode: data.mappingBarcode,
            group: data.group,
            acceptBulkData: data.acceptBulkData,
            remarksRequired: data.remarksRequired,
            classification: data.classification,
          },
        });

        results.push(result);
      }
    });

    return {
      message: 'Mobile sync completed successfully',
      processedCount: results.length,
      data: results,
    };
  }

  async getSystemConfig(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return config ? config : { key, value: '' };
  }

  async upsertSystemConfig(key: string, value: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
