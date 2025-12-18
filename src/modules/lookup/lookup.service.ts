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

  getTransporters() {
    return this.prisma.transporter.findMany({ orderBy: { id: 'asc' } });
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

  getPlantCodes() {
    return this.prisma.plantCode.findMany({ orderBy: { id: 'asc' } });
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

  getSalesZones() {
    return this.prisma.salesZone.findMany({ orderBy: { id: 'asc' } });
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

  getPackConfigs() {
    return this.prisma.packConfig.findMany({ orderBy: { id: 'asc' } });
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

  getCustomers() {
    return this.prisma.customer.findMany({ orderBy: { id: 'asc' } });
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

  getPrinters() {
    return this.prisma.printer.findMany({ orderBy: { id: 'asc' } });
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

  getMaterialBarcodes() {
    return this.prisma.materialBarcode.findMany({ orderBy: { id: 'asc' } });
  }

  async createMaterialBarcode(dto: CreateMaterialBarcodeDto) {
    const existing = await this.prisma.materialBarcode.findFirst({
      where: { erpCode: dto.erpCode },
    });

    if (existing) {
      throw new BadRequestException(
        `Material Barcode with ERP Code "${dto.erpCode}" already exists.`
      );
    }

    return this.prisma.materialBarcode.create({ data: dto });
  }

  async updateMaterialBarcode(id: number, dto: UpdateMaterialBarcodeDto) {
    if (dto.erpCode) {
      const existing = await this.prisma.materialBarcode.findFirst({
        where: { 
          erpCode: dto.erpCode,
          id: { not: id } 
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Material Barcode with ERP Code "${dto.erpCode}" already exists.`
        );
      }
    }

    return this.prisma.materialBarcode.update({ where: { id }, data: dto });
  }

  async deleteMaterialBarcode(id: number) {
    return await this.prisma.materialBarcode.delete({ where: { id } });
  }

  async generateBulkTemplate(res: Response) {
    const workbook = new Workbook();

    const sheets = [
      { 
        name: 'Products', 
        data: await this.getProducts(), 
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Code', key: 'code', width: 20 }
        ]
      },
      { 
        name: 'Transporters', 
        data: await this.getTransporters(), 
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 }
        ]
      },
      { 
        name: 'Plant Codes', 
        data: await this.getPlantCodes(), 
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Code', key: 'code', width: 15 },
          { header: 'Description', key: 'description', width: 30 }
        ]
      },
      { 
        name: 'Sales Zones', 
        data: await this.getSalesZones(), 
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 }
        ]
      },
      { 
        name: 'Packing Configs', 
        data: await this.getPackConfigs(), 
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Config Name', key: 'configName', width: 30 }
        ]
      },
      { 
        name: 'Customers', 
        data: await this.getCustomers(), 
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 },
          { header: 'Address', key: 'address', width: 40 }
        ]
      },
      { 
        name: 'Printers', 
        data: await this.getPrinters(), 
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 30 }
        ]
      },
      { 
        name: 'Material Barcodes', 
        data: await this.getMaterialBarcodes(), 
        columns: [
          { header: 'ID (Do not edit)', key: 'id', width: 10 },
          { header: 'ERP Code', key: 'erpCode', width: 20 },
          { header: 'Mapping Barcode', key: 'mappingBarcode', width: 20 },
          { header: 'Group', key: 'group', width: 15 },
          { header: 'Accept Bulk Data (True/False)', key: 'acceptBulkData', width: 25 },
          { header: 'Remarks Required (True/False)', key: 'remarksRequired', width: 25 },
          { header: 'Classification', key: 'classification', width: 20 }
        ]
      },
    ];

    for (const sheetDef of sheets) {
      const sheet = workbook.addWorksheet(sheetDef.name);
      sheet.columns = sheetDef.columns;
      sheet.addRows(sheetDef.data);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="master_data_bulk.xlsx"'
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
      return val ? String(val).trim() : null;
    };
    
    const getBool = (row, colIdx) => {
      const val = row.getCell(colIdx).value;
      if (typeof val === 'boolean') return val;
      const s = String(val).toLowerCase().trim();
      return s === 'true' || s === 'yes' || s === '1';
    };

    await this.prisma.$transaction(async (tx) => {
      const promises: Promise<any>[] = []; 

      const productSheet = workbook.getWorksheet('Products');
      if (productSheet) {
        productSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; 
          const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
          const name = getVal(row, 2);
          const code = getVal(row, 3);

          if (name) { 
            if (id) {
              promises.push(tx.product.update({ where: { id }, data: { name, code } }).catch(() => {}));
            } else {
              promises.push(tx.product.create({ data: { name, code } }).catch(() => {}));
            }
          }
        });
        results.push('Products processed');
      }

      const transpSheet = workbook.getWorksheet('Transporters');
      if (transpSheet) {
        transpSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
          const name = getVal(row, 2);
          if (name) {
            if (id) promises.push(tx.transporter.update({ where: { id }, data: { name } }).catch(() => {}));
            else promises.push(tx.transporter.create({ data: { name } }).catch(() => {}));
          }
        });
        results.push('Transporters processed');
      }

      const plantSheet = workbook.getWorksheet('Plant Codes');
      if (plantSheet) {
        plantSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
          const code = getVal(row, 2);
          const description = getVal(row, 3) || '';
          if (code) {
            if (id) promises.push(tx.plantCode.update({ where: { id }, data: { code, description } }).catch(() => {}));
            else promises.push(tx.plantCode.create({ data: { code, description } }).catch(() => {}));
          }
        });
        results.push('Plant Codes processed');
      }

      const zoneSheet = workbook.getWorksheet('Sales Zones');
      if (zoneSheet) {
        zoneSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
          const name = getVal(row, 2);
          if (name) {
            if (id) promises.push(tx.salesZone.update({ where: { id }, data: { name } }).catch(() => {}));
            else promises.push(tx.salesZone.create({ data: { name } }).catch(() => {}));
          }
        });
        results.push('Sales Zones processed');
      }

      const packSheet = workbook.getWorksheet('Packing Configs');
      if (packSheet) {
        packSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
          const configName = getVal(row, 2);
          if (configName) {
            if (id) promises.push(tx.packConfig.update({ where: { id }, data: { configName } }).catch(() => {}));
            else promises.push(tx.packConfig.create({ data: { configName } }).catch(() => {}));
          }
        });
        results.push('Packing Configs processed');
      }

      const custSheet = workbook.getWorksheet('Customers');
      if (custSheet) {
        custSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
          const name = getVal(row, 2);
          const address = getVal(row, 3) || '';
          if (name) {
            if (id) promises.push(tx.customer.update({ where: { id }, data: { name, address } }).catch(() => {}));
            else promises.push(tx.customer.create({ data: { name, address } }).catch(() => {}));
          }
        });
        results.push('Customers processed');
      }

      const printSheet = workbook.getWorksheet('Printers');
      if (printSheet) {
        printSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
          const name = getVal(row, 2);
          if (name) {
            if (id) promises.push(tx.printer.update({ where: { id }, data: { name } }).catch(() => {}));
            else promises.push(tx.printer.create({ data: { name } }).catch(() => {}));
          }
        });
        results.push('Printers processed');
      }

      const matSheet = workbook.getWorksheet('Material Barcodes');
      if (matSheet) {
        matSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const id = row.getCell(1).value ? Number(row.getCell(1).value) : null;
          const erpCode = getVal(row, 2);
          const mappingBarcode = getVal(row, 3);
          const group = getVal(row, 4);
          const acceptBulkData = getBool(row, 5);
          const remarksRequired = getBool(row, 6);
          const classification = getVal(row, 7);

          if (erpCode) {
            const data = {
              erpCode,
              mappingBarcode,
              group,
              acceptBulkData,
              remarksRequired,
              classification
            };
            if (id) promises.push(tx.materialBarcode.update({ where: { id }, data }).catch(() => {}));
            else promises.push(tx.materialBarcode.create({ data }).catch(() => {}));
          }
        });
        results.push('Material Barcodes processed');
      }

      await Promise.all(promises);
    });

    return { message: 'Bulk import completed successfully', details: results };
  }
}
