import { BadRequestException } from '@nestjs/common';
import { CellValue, Workbook } from 'exceljs';

const HEADERS = {
  plantCode: 'Plant Code',
  masterBarcode: 'Master Barcode',
  rackNumber: 'Rack Number',
} as const;

function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface LocationWorkbookEntry {
  plantCode: string;
  masterBarcode: string;
  rackNumber: string;
}

export interface LocationUploadRow extends LocationWorkbookEntry {
  rowNumber: number;
  errors: string[];
}

function readCell(value: CellValue): string | null {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (typeof value === 'object' && 'richText' in value) {
    return value.richText.map((part) => part.text).join('').trim();
  }
  return null;
}

export async function readLocationWorkbook(buffer: Buffer): Promise<LocationUploadRow[]> {
  const workbook = new Workbook();
  try {
    // Use ExcelJS's expected ArrayBuffer input, independent of the Node Buffer typings.
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch {
    throw new BadRequestException('The uploaded file could not be read as an .xlsx workbook.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The workbook must contain a worksheet.');

  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    const header = normaliseHeader(cell.text);
    const key = header === 'materialbarcode' ? 'masterbarcode' : header;
    if (!key) return;
    if (columns.has(key)) {
      throw new BadRequestException(`Duplicate Excel header: ${cell.text}.`);
    }
    columns.set(key, column);
  });

  if (columns.has('action') || columns.has('originalracknumber')) {
    throw new BadRequestException('This workbook uses the old format. Download the latest Location Master Excel file.');
  }

  const required = Object.values(HEADERS);
  const missing = required.filter((header) => !columns.has(normaliseHeader(header)));
  if (missing.length) {
    throw new BadRequestException(`Missing Excel columns: ${missing.join(', ')}.`);
  }

  const rows: LocationUploadRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const errors: string[] = [];
    const read = (header: string): string => {
      const column = columns.get(normaliseHeader(header));
      if (column === undefined) return '';
      const value = readCell(row.getCell(column).value);
      if (value === null || value.includes('\0')) {
        errors.push(`${header} must contain plain text or a whole number.`);
        return '';
      }
      return value;
    };

    const values = {
      rowNumber,
      plantCode: read(HEADERS.plantCode),
      masterBarcode: read(HEADERS.masterBarcode),
      rackNumber: read(HEADERS.rackNumber),
      errors,
    };

    if (values.plantCode || values.masterBarcode || values.rackNumber || errors.length) {
      rows.push(values);
    }
  });

  if (!rows.length) throw new BadRequestException('The workbook contains no location rows.');
  return rows;
}

export async function createLocationWorkbook(entries: LocationWorkbookEntry[]): Promise<Buffer> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Locations');
  sheet.columns = Object.entries(HEADERS).map(([key, header]) => ({
    key,
    header,
    width: Math.max(20, header.length + 4),
    style: { numFmt: '@' },
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(entries);

  const instructions = workbook.addWorksheet('Instructions');
  instructions.getColumn(1).width = 112;
  instructions.addRows([
    ['Add new rows below the saved rows in the Locations sheet. Keep the header and saved rows as they are.'],
    ['Enter Plant Code, Master Barcode, and Rack Number on every new row.'],
    ['Use the assigned Master Barcode when adding a level to an existing rack.'],
    ['Master Barcode must contain exactly 15 letters or digits. Use text cells to preserve leading zeros.'],
    ['Use first-level-last for Rack Number, for example 12-A-12.'],
    ['Use Delete in the Location Master screen to remove a level.'],
  ]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
