import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { cellToText, normaliseHeader } from '../shared/audit-excel.util';
import {
  STOCK_HEADERS,
  RESERVATION_HEADERS,
  type StockHeaders,
  type ReservationHeaders,
} from './free-stock-column-config.service';

export type StockInput = {
  storageType: string | null;
  storageBin: string;
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
  qty: string;
  soNumber: string;
};

export type StockIdentity = {
  storageBin?: string;
  materialCode?: string;
  batch?: string;
};
export type StockRowIssue = {
  rowNo: number;
  storageBin: string;
  materialCode: string;
  batch: string;
  column: string;
  value: string;
  reason: string;
};
export type StockFileResult = {
  rows: StockInput[];
  totalRows: number;
  issues: StockRowIssue[];
  skippedIdentities: StockIdentity[];
};
/** Match invalid rows conservatively, including rows with an incomplete identity. */
export function skippedStockMatcher(identities: StockIdentity[]) {
  const patterns = new Set<string>();
  for (const identity of identities) {
    const values = [identity.storageBin, identity.materialCode, identity.batch];
    const mask = values.reduce(
      (n, value, index) => (value ? n | (1 << index) : n),
      0,
    );
    patterns.add(
      JSON.stringify([
        mask,
        ...values.filter((_, index) => mask & (1 << index)),
      ]),
    );
  }
  return (item: {
    storageBin: string | null;
    materialCode: string;
    batch: string;
  }) => {
    if (patterns.has('[0]')) return true;
    const values = [item.storageBin, item.materialCode, item.batch];
    for (let mask = 1; mask < 8; mask++) {
      if (
        patterns.has(
          JSON.stringify([
            mask,
            ...values.filter((_, index) => mask & (1 << index)),
          ]),
        )
      )
        return true;
    }
    return false;
  };
}

export function identifier(value: string, label: string, max = 100): string {
  const result = (value ?? '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .trim()
    .toUpperCase();
  if (!result || result.length > max)
    throw new Error(
      `${label} is required and must be at most ${max} characters.`,
    );
  return result;
}

export function quantity(value: string, positive = false): string {
  const raw = value.trim();
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,3})?$/.test(raw)) {
    throw new Error('Quantity must be a number with at most 3 decimal places.');
  }
  const number = new Prisma.Decimal(raw.replace(/,/g, ''));
  if (positive && !number.greaterThan(0)) {
    throw new Error('Requested quantity must be greater than zero.');
  }

  if (number.abs().greaterThan('999999999999999.999')) {
    throw new Error('Quantity exceeds the supported limit.');
  }
  return number.toFixed();
}

function wholeQuantity(value: string): string {
  const raw = value.trim();

  if (raw.includes('.')) {
    throw new Error('Decimal values are not allowed. Enter a whole number.');
  }

  return quantity(raw);
}

function text(row: ExcelJS.Row, column: number, max: number): string | null {
  const value = cellToText(row.getCell(column).value);
  if (value.length > max)
    throw new Error(`Column ${column} exceeds ${max} characters.`);
  return value || null;
}

function excelDate(value: ExcelJS.CellValue, date1904: boolean): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('Invalid date.');
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 1 || value > 2958465)
      throw new Error('Invalid Excel date.');
    const offset = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    return new Date(offset + Math.floor(value) * 86400000);
  }
  const raw = cellToText(value);
  if (!raw) throw new Error('Date has no readable value.');
  const ymd = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(raw);
  const dmy = /^(\d{1,2})[.,/-](\d{1,2})[.,/-](\d{4})$/.exec(raw);
  if (!ymd && !dmy)
    throw new Error('Date must be an Excel date or DD.MM.YYYY / YYYY-MM-DD.');
  const year = Number(ymd ? ymd[1] : dmy![3]);
  const month = Number(ymd ? ymd[2] : dmy![2]);
  const day = Number(ymd ? ymd[3] : dmy![1]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    year > 9999 ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Invalid calendar date.');
  }
  return parsed;
}

async function workbook(filePath: string): Promise<ExcelJS.Workbook> {
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.readFile(filePath);
  } catch {
    throw new BadRequestException({
      code: 'FREE_STOCK_INVALID_FILE',
      message: 'Upload a readable .xlsx file.',
    });
  }
  return book;
}

function fail(
  errors: { rowNo: number; message: string }[],
  totalErrors: number,
): never {
  throw new BadRequestException({
    code: 'FREE_STOCK_INVALID_ROWS',
    message: `${totalErrors} invalid row(s). Nothing was saved.`,
    errors,
    totalErrors,
  });
}

export async function parseStockFile(
  filePath: string,
  aliases: StockHeaders = STOCK_HEADERS,
): Promise<StockFileResult> {
  const book = await workbook(filePath);
  const sheet = book.worksheets.find(
    (s) => normaliseHeader(s.name) === 'sheet1',
  );
  if (!sheet || sheet.state === 'hidden' || sheet.state === 'veryHidden') {
    throw new BadRequestException(
      'The stock workbook must contain a visible Sheet1.',
    );
  }
  const found = locateHeaders(sheet, aliases);
  if (!found)
    throw new BadRequestException(
      'The stock file format is incorrect. Check the configured Excel headers and upload again.',
    );
  const { header, columns } = found;
  const records: {
    rowNo: number;
    raw: { storageBin: string; materialCode: string; batch: string };
    identity: StockIdentity;
    item: StockInput;
    problems: { column: string; value: string; message: string }[];
  }[] = [];
  for (let rowNo = header + 1; rowNo <= sheet.rowCount; rowNo++) {
    const row = sheet.getRow(rowNo);
    if (
      !Object.values(columns).some((column) =>
        cellToText(row.getCell(column).value),
      )
    )
      continue;
    const problems: { column: string; value: string; message: string }[] = [];
    function capture<T>(
      column: string,
      number: number,
      read: () => T,
      fallback: T,
    ): T {
      try {
        return read();
      } catch (error) {
        problems.push({
          column,
          value: cellToText(row.getCell(number).value),
          message: error instanceof Error ? error.message : 'Invalid value.',
        });
        return fallback;
      }
    }
    const raw = {
      storageBin: cellToText(row.getCell(columns.storageBin).value),
      materialCode: cellToText(row.getCell(columns.materialCode).value),
      batch: cellToText(row.getCell(columns.batch).value),
    };
    const storageBin = capture(
      'Storage Bin',
      columns.storageBin,
      () => identifier(raw.storageBin, 'Storage Bin'),
      '',
    );
    const materialCode = capture(
      'Material',
      columns.materialCode,
      () => identifier(raw.materialCode, 'Material'),
      '',
    );
    const batch = capture(
      'Batch',
      columns.batch,
      () => identifier(raw.batch, 'Batch'),
      '',
    );
    const identity: StockIdentity = {
      ...(storageBin ? { storageBin } : {}),
      ...(materialCode ? { materialCode } : {}),
      ...(batch ? { batch } : {}),
    };
    const item: StockInput = {
      storageBin,
      materialCode,
      batch,
      storageType: capture(
        'Type',
        columns.storageType,
        () => text(row, columns.storageType, 100),
        null,
      ),
      plant: capture(
        'Plant',
        columns.plant,
        () => text(row, columns.plant, 100),
        null,
      ),
      storageLocation: capture(
        'Location',
        columns.storageLocation,
        () => text(row, columns.storageLocation, 100),
        null,
      ),

      availableQty: (() => {
        const raw = cellToText(row.getCell(columns.availableQty).value).trim();

        if (!raw) return null;

        try {
          return quantity(raw);
        } catch {
          return null;
        }
      })(),

      stockQty: capture(
        'Stock',
        columns.stockQty,
        () => wholeQuantity(cellToText(row.getCell(columns.stockQty).value)),
        '0',
      ),

      certificateNo: capture(
        'Certificate No.',
        columns.certificateNo,
        () => text(row, columns.certificateNo, 255),
        null,
      ),
      grDate: capture(
        'GR Date',
        columns.grDate,
        () =>
          excelDate(
            row.getCell(columns.grDate).value,
            Boolean(book.properties.date1904),
          ),
        null,
      ),
      grNumber: capture(
        'GR Number',
        columns.grNumber,
        () => text(row, columns.grNumber, 100),
        null,
      ),
      delivery: capture(
        'Delivery',
        columns.delivery,
        () => text(row, columns.delivery, 255),
        null,
      ),
      lastMovementDate: capture(
        'Last Movement',
        columns.lastMovementDate,
        () =>
          excelDate(
            row.getCell(columns.lastMovementDate).value,
            Boolean(book.properties.date1904),
          ),
        null,
      ),
      lastChanger: capture(
        'Last Changer',
        columns.lastChanger,
        () => text(row, columns.lastChanger, 255),
        null,
      ),
    };
    records.push({ rowNo, raw, identity, item, problems });
  }
  if (!records.length)
    throw new BadRequestException(
      'The stock file contains no stock rows. An empty file cannot close existing stock.',
    );
  const invalid = records.filter((record) => record.problems.length);
  return {
    totalRows: records.length,
    rows: records
      .filter((record) => !record.problems.length)
      .map((record) => record.item),
    skippedIdentities: invalid.map((record) => record.identity),
    issues: invalid.map((record) => ({
      rowNo: record.rowNo,
      ...record.raw,
      column: record.problems.map((problem) => problem.column).join(', '),
      value: record.problems
        .map((problem) => problem.value)
        .filter(Boolean)
        .join('; '),
      reason: record.problems
        .map((problem) => `${problem.column}: ${problem.message}`)
        .join(' '),
    })),
  };
}

/** Duplicates are separate requests, processed in original file order. */
export function normalizeReservationLines(
  lines: {
    materialCode: string;
    qty: string;
    soNumber?: string | null;
    rowNo?: number;
  }[],
): ReservationInput[] {
  if (!lines.length)
    throw new BadRequestException('At least one reservation row is required.');
  const errors: { rowNo: number; message: string }[] = [];
  let totalErrors = 0;
  const result: ReservationInput[] = [];
  lines.forEach((line, index) => {
    const rowNo = line.rowNo ?? index + 1;
    try {
      result.push({
        rowNo,
        materialCode: identifier(line.materialCode, 'Material'),
        qty: quantity(line.qty, true),
        soNumber: identifier(line.soNumber ?? '', 'SO Number'),
      });
    } catch (error) {
      totalErrors++;
      if (errors.length < 100)
        errors.push({
          rowNo,
          message: error instanceof Error ? error.message : 'Invalid row.',
        });
    }
  });
  if (totalErrors) fail(errors, totalErrors);
  return result;
}

/** Header aliases are configurable; column positions and ordering are not hard-coded. */
function locateHeaders<T extends string>(
  sheet: ExcelJS.Worksheet,
  aliases: Record<T, readonly string[]>,
) {
  for (let header = 1; header <= Math.min(sheet.rowCount, 30); header++) {
    const index = new Map<string, number>();
    sheet.getRow(header).eachCell((cell, column) => {
      const key = normaliseHeader(cellToText(cell.value));
      if (key && !index.has(key)) index.set(key, column);
    });
    const columns = {} as Record<T, number>;
    let complete = true;
    for (const field of Object.keys(aliases) as T[]) {
      const column = aliases[field]
        .map((alias) => index.get(normaliseHeader(alias)))
        .find((value) => value !== undefined);
      if (column === undefined) {
        complete = false;
        break;
      }
      columns[field] = column;
    }
    if (complete) {
      if (new Set(Object.values(columns)).size !== Object.keys(aliases).length)
        throw new BadRequestException(
          'Configured fields must use different Excel columns.',
        );
      return { header, columns };
    }
  }
  return null;
}

function validateReservationUploadRow(line: {
  qty: string;
  soNumber: string;
}): string | null {
  const qty = line.qty.trim();
  const so = line.soNumber.trim();
  const messages: string[] = [];

  if (!qty) {
    messages.push('Quantity is required.');
  } else if (qty.includes('.')) {
    messages.push('Quantity cannot have decimals. Enter a whole number.');
  } else if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(qty)) {
    messages.push(
      'Quantity must be numeric with no special characters (commas only in the correct format, e.g. 1,000).',
    );
  }

  if (!so) {
    messages.push('SO Number is required.');
  } 
  // else if (!/^\d{10}$/.test(so)) {
  //   messages.push('SO Number must be numeric and exactly 10 digits.');
  // }

  return messages.length ? messages.join(' ') : null;
}
export async function parseReservationFile(
  filePath: string,
  aliases: ReservationHeaders = RESERVATION_HEADERS,
): Promise<ReservationInput[]> {
  const book = await workbook(filePath);
  for (const sheet of book.worksheets.filter(
    (s) => s.state !== 'hidden' && s.state !== 'veryHidden',
  )) {
    const found = locateHeaders(sheet, aliases);
    if (!found) continue;
    const lines: {
      rowNo: number;
      materialCode: string;
      qty: string;
      soNumber: string;
    }[] = [];
    for (let rowNo = found.header + 1; rowNo <= sheet.rowCount; rowNo++) {
      const row = sheet.getRow(rowNo);
      const materialCode = cellToText(
        row.getCell(found.columns.materialCode).value,
      );
      const qty = cellToText(row.getCell(found.columns.qty).value);
      const soNumber = cellToText(row.getCell(found.columns.soNumber).value);
      if (!materialCode && !qty && !soNumber) continue;
      lines.push({ rowNo, materialCode, qty, soNumber });
    }

    const errors: { rowNo: number; message: string }[] = [];
    let totalErrors = 0;
    for (const line of lines) {
      const message = validateReservationUploadRow(line);
      if (message) {
        totalErrors++;
        if (errors.length < 100) errors.push({ rowNo: line.rowNo, message });
      }
    }
    if (totalErrors) fail(errors, totalErrors);

    return normalizeReservationLines(lines);
  }
  throw new BadRequestException(
    'MATERIAL, QTY and SO NUMBER columns are required. Check the configured Excel headers.',
  );
}
