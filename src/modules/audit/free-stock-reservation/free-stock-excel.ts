import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { cellToText, normaliseHeader } from '../shared/audit-excel.util';

export type StockInput = {
  storageType: string | null;
  storageBin: string | null;
  materialCode: string;
  plant: string | null;
  storageLocation: string | null;
  availableQty: string | null;
  batch: string;
  stockQty: string;
  certificateNo: string | null;
  grDate: Date | null;
  grNumber: string | null;
  delivery: string | null;
  lastMovementDate: Date | null;
  lastChanger: string | null;
};

export type ReservationInput = {
  rowNo: number;
  materialCode: string;
  batch: string;
  qty: string;
  soNumber: string | null;
};

export function stockKey(materialCode: string, batch: string): string {
  return JSON.stringify([materialCode, batch]);
}

export function identifier(value: string, label: string, max = 100): string {
  const result = value.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').trim().toUpperCase();
  if (!result || result.length > max) throw new Error(`${label} is required and must be at most ${max} characters.`);
  return result;
}

export function quantity(value: string, positive = false): string {
  const raw = value.trim();
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,3})?$/.test(raw)) {
    throw new Error('Quantity must be a number with at most 3 decimal places.');
  }
  const number = new Prisma.Decimal(raw.replace(/,/g, ''));
  if (number.abs().greaterThan('999999999999999.999') || (positive && !number.greaterThan(0))) {
    throw new Error(positive ? 'Requested quantity must be greater than zero and fit Decimal(18,3).' : 'Quantity exceeds Decimal(18,3).');
  }
  return number.toFixed();
}

function text(row: ExcelJS.Row, column: number, max: number): string | null {
  const value = cellToText(row.getCell(column).value);
  if (value.length > max) throw new Error(`Column ${column} exceeds ${max} characters.`);
  return value || null;
}

function excelDate(value: ExcelJS.CellValue, date1904: boolean): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('Invalid date.');
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 1 || value > 2958465) throw new Error('Invalid Excel date.');
    const offset = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    return new Date(offset + Math.floor(value) * 86400000);
  }
  const raw = cellToText(value);
  if (!raw) throw new Error('Date has no readable value.');
  const ymd = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(raw);
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(raw);
  if (!ymd && !dmy) throw new Error('Date must be an Excel date or DD.MM.YYYY / YYYY-MM-DD.');
  const year = Number(ymd ? ymd[1] : dmy![3]);
  const month = Number(ymd ? ymd[2] : dmy![2]);
  const day = Number(ymd ? ymd[3] : dmy![1]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || year > 9999 || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error('Invalid calendar date.');
  }
  return parsed;
}

async function workbook(filePath: string): Promise<ExcelJS.Workbook> {
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.readFile(filePath);
  } catch {
    throw new BadRequestException({ code: 'FREE_STOCK_INVALID_FILE', message: 'Upload a readable .xlsx file.' });
  }
  return book;
}

function fail(errors: { rowNo: number; message: string }[], totalErrors: number): never {
  throw new BadRequestException({ code: 'FREE_STOCK_INVALID_ROWS', message: `${totalErrors} invalid row(s). Nothing was saved.`, errors, totalErrors });
}

export async function parseStockFile(filePath: string): Promise<StockInput[]> {
  const book = await workbook(filePath);
  const sheet = book.worksheets.find((s) => normaliseHeader(s.name) === 'sheet1');
  if (!sheet || sheet.state === 'hidden' || sheet.state === 'veryHidden') {
    throw new BadRequestException('The stock workbook must contain a visible Sheet1.');
  }
  const expected = ['typ', 'storagebin', 'material', 'plnt', 'location', 'avail', 'batch', 'stock', 'certno', 'grdate', 'grnumber', 'delivery', 'lastmvmt', 'lastchanger'];
  let header = 0;
  for (let row = 1; row <= Math.min(sheet.rowCount, 30); row++) {
    if (expected.every((value, i) => normaliseHeader(cellToText(sheet.getRow(row).getCell(i + 1).value)) === value)) {
      header = row;
      break;
    }
  }
  if (!header) throw new BadRequestException('The stock file format is incorrect. Please check the file and upload it again.');
  const rows: StockInput[] = [];
  const keys = new Set<string>();
  const errors: { rowNo: number; message: string }[] = [];
  let totalErrors = 0;
  for (let rowNo = header + 1; rowNo <= sheet.rowCount; rowNo++) {
    const row = sheet.getRow(rowNo);
    if (!Array.from({ length: 14 }, (_, i) => cellToText(row.getCell(i + 1).value)).some(Boolean)) continue;
    try {
      const materialCode = identifier(cellToText(row.getCell(3).value), 'Material');
      const batch = identifier(cellToText(row.getCell(7).value), 'Batch');
      const key = stockKey(materialCode, batch);
      if (keys.has(key)) throw new Error('Duplicate Material + Batch in this snapshot.');
      const item: StockInput = {
        storageType: text(row, 1, 100), storageBin: text(row, 2, 100), materialCode,
        plant: text(row, 4, 100), storageLocation: text(row, 5, 100),
        availableQty: text(row, 6, 100) === null ? null : quantity(cellToText(row.getCell(6).value)),
        batch, stockQty: quantity(cellToText(row.getCell(8).value)),
        certificateNo: text(row, 9, 255), grDate: excelDate(row.getCell(10).value, Boolean(book.properties.date1904)),
        grNumber: text(row, 11, 100), delivery: text(row, 12, 255),
        lastMovementDate: excelDate(row.getCell(13).value, Boolean(book.properties.date1904)),
        lastChanger: text(row, 14, 255),
      };
      rows.push(item);
      keys.add(key);
    } catch (error) {
      totalErrors++;
      if (errors.length < 100) errors.push({ rowNo, message: error instanceof Error ? error.message : 'Invalid row.' });
    }
  }
  if (totalErrors) fail(errors, totalErrors);
  if (!rows.length) throw new BadRequestException('The stock file contains no valid stock rows. An empty snapshot cannot close existing stock.');
  return rows;
}

export function normalizeReservationLines(lines: { materialCode: string; batch: string; qty: string; soNumber?: string | null; rowNo?: number }[]): ReservationInput[] {
  if (!lines.length) throw new BadRequestException('At least one reservation row is required.');
  const keys = new Set<string>();
  const errors: { rowNo: number; message: string }[] = [];
  let totalErrors = 0;
  const result: ReservationInput[] = [];
  lines.forEach((line, index) => {
    const rowNo = line.rowNo ?? index + 1;
    try {
      const materialCode = identifier(line.materialCode, 'Material');
      const batch = identifier(line.batch, 'Batch');
      const key = stockKey(materialCode, batch);
      if (keys.has(key)) throw new Error('Duplicate Material + Batch in the reservation request.');
      const soNumber = line.soNumber?.trim() || null;
      if (soNumber && soNumber.length > 100) throw new Error('SO Number exceeds 100 characters.');
      result.push({ rowNo, materialCode, batch, qty: quantity(line.qty, true), soNumber });
      keys.add(key);
    } catch (error) {
      totalErrors++;
      if (errors.length < 100) errors.push({ rowNo, message: error instanceof Error ? error.message : 'Invalid row.' });
    }
  });
  if (totalErrors) fail(errors, totalErrors);
  return result;
}

export async function parseReservationFile(filePath: string): Promise<ReservationInput[]> {
  const book = await workbook(filePath);
  let chosen: { sheet: ExcelJS.Worksheet; header: number; material: number; batch: number; qty: number; so: number | null } | null = null;
  for (const sheet of book.worksheets.filter((s) => s.state !== 'hidden' && s.state !== 'veryHidden')) {
    for (let header = 1; header <= Math.min(sheet.rowCount, 30); header++) {
      const columns = new Map<string, number>();
      sheet.getRow(header).eachCell((cell, column) => columns.set(normaliseHeader(cellToText(cell.value)), column));
      const material = columns.get('material') ?? columns.get('materialcode');
      const batch = columns.get('batch');
      const qty = columns.get('reqqty') ?? columns.get('qty') ?? columns.get('quantity');
      if (material && batch && qty) {
        chosen = { sheet, header, material, batch, qty, so: columns.get('sonumber') ?? columns.get('so') ?? columns.get('sono') ?? null };
        break;
      }
    }
    if (chosen) break;
  }
  if (!chosen) throw new BadRequestException('A sheet with Material, Batch and Qty / Req Qty columns is required.');
  const { sheet, header, material, batch, qty, so } = chosen;
  let defaultSo: string | null = null;
  for (let i = 1; i < header; i++) {
    sheet.getRow(i).eachCell((cell, column) => {
      if (['requiredso', 'sonumber', 'sono', 'so'].includes(normaliseHeader(cellToText(cell.value)))) {
        defaultSo = cellToText(sheet.getRow(i).getCell(column + 1).value) || null;
      }
    });
  }
  const lines: { materialCode: string; batch: string; qty: string; soNumber: string | null; rowNo: number }[] = [];
  for (let rowNo = header + 1; rowNo <= sheet.rowCount; rowNo++) {
    const row = sheet.getRow(rowNo);
    const values = [material, batch, qty, ...(so ? [so] : [])].map((column) => cellToText(row.getCell(column).value));
    if (!values.some(Boolean)) continue;
    lines.push({ rowNo, materialCode: values[0], batch: values[1], qty: values[2], soNumber: (so ? cellToText(row.getCell(so).value) : '') || defaultSo });
  }
  return normalizeReservationLines(lines);
}
