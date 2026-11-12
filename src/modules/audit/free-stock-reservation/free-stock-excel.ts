import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { cellToText, normaliseHeader } from '../shared/audit-excel.util';

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
  storageBin: string;
  rowNo: number;
  materialCode: string;
  batch: string;
  qty: string;
  soNumber: string | null;
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
export function stockKey(
  storageBin: string | null,
  materialCode: string,
  batch: string,
): string {
  return JSON.stringify([storageBin, materialCode, batch]);
}

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
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(raw);
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
  const expected = [
    'typ',
    'storagebin',
    'material',
    'plnt',
    'location',
    'avail',
    'batch',
    'stock',
    'certno',
    'grdate',
    'grnumber',
    'delivery',
    'lastmvmt',
    'lastchanger',
  ];
  let header = 0;
  for (let row = 1; row <= Math.min(sheet.rowCount, 30); row++) {
    if (
      expected.every(
        (value, i) =>
          normaliseHeader(
            cellToText(sheet.getRow(row).getCell(i + 1).value),
          ) === value,
      )
    ) {
      header = row;
      break;
    }
  }
  if (!header)
    throw new BadRequestException(
      'The stock file format is incorrect. Please check the file and upload it again.',
    );
  const records: {
    rowNo: number;
    raw: { storageBin: string; materialCode: string; batch: string };
    identity: StockIdentity;
    key: string | null;
    item: StockInput;
    problems: { column: string; value: string; message: string }[];
  }[] = [];
  const occurrences = new Map<string, number[]>();
  for (let rowNo = header + 1; rowNo <= sheet.rowCount; rowNo++) {
    const row = sheet.getRow(rowNo);
    if (
      !Array.from({ length: 14 }, (_, i) =>
        cellToText(row.getCell(i + 1).value),
      ).some(Boolean)
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
      storageBin: cellToText(row.getCell(2).value),
      materialCode: cellToText(row.getCell(3).value),
      batch: cellToText(row.getCell(7).value),
    };
    const storageBin = capture(
      'Storage Bin',
      2,
      () => identifier(raw.storageBin, 'Storage Bin'),
      '',
    );
    const materialCode = capture(
      'Material',
      3,
      () => identifier(raw.materialCode, 'Material'),
      '',
    );
    const batch = capture('Batch', 7, () => identifier(raw.batch, 'Batch'), '');
    const identity: StockIdentity = {
      ...(storageBin ? { storageBin } : {}),
      ...(materialCode ? { materialCode } : {}),
      ...(batch ? { batch } : {}),
    };
    const key =
      storageBin && materialCode && batch
        ? stockKey(storageBin, materialCode, batch)
        : null;
    if (key) {
      const indices = occurrences.get(key);
      if (indices) indices.push(records.length);
      else occurrences.set(key, [records.length]);
    }
    const item: StockInput = {
      storageBin,
      materialCode,
      batch,
      storageType: capture('Type', 1, () => text(row, 1, 100), null),
      plant: capture('Plant', 4, () => text(row, 4, 100), null),
      storageLocation: capture('Location', 5, () => text(row, 5, 100), null),
      availableQty: capture(
        'Avail',
        6,
        () =>
          text(row, 6, 100) === null
            ? null
            : quantity(cellToText(row.getCell(6).value)),
        null,
      ),
      stockQty: capture(
        'Stock',
        8,
        () => quantity(cellToText(row.getCell(8).value)),
        '0',
      ),
      certificateNo: capture(
        'Certificate No.',
        9,
        () => text(row, 9, 255),
        null,
      ),
      grDate: capture(
        'GR Date',
        10,
        () =>
          excelDate(row.getCell(10).value, Boolean(book.properties.date1904)),
        null,
      ),
      grNumber: capture('GR Number', 11, () => text(row, 11, 100), null),
      delivery: capture('Delivery', 12, () => text(row, 12, 255), null),
      lastMovementDate: capture(
        'Last Movement',
        13,
        () =>
          excelDate(row.getCell(13).value, Boolean(book.properties.date1904)),
        null,
      ),
      lastChanger: capture('Last Changer', 14, () => text(row, 14, 255), null),
    };
    records.push({ rowNo, raw, identity, key, item, problems });
  }
  if (!records.length)
    throw new BadRequestException(
      'The stock file contains no stock rows. An empty file cannot close existing stock.',
    );
  // Skip all conflicting copies rather than silently selecting a quantity from one row.
  for (const indices of occurrences.values()) {
    if (indices.length < 2) continue;
    for (const index of indices)
      records[index].problems.push({
        column: 'Storage Bin + Material + Batch',
        value: '',
        message:
          'This Storage Bin, Material and Batch combination appears more than once in the file. All copies will be skipped.',
      });
  }
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

export function normalizeReservationLines(
  lines: {
    storageBin: string;
    materialCode: string;
    batch: string;
    qty: string;
    soNumber?: string | null;
    rowNo?: number;
  }[],
): ReservationInput[] {
  if (!lines.length)
    throw new BadRequestException('At least one reservation row is required.');
  const keys = new Set<string>();
  const errors: { rowNo: number; message: string }[] = [];
  let totalErrors = 0;
  const result: ReservationInput[] = [];
  lines.forEach((line, index) => {
    const rowNo = line.rowNo ?? index + 1;
    try {
      const storageBin = identifier(line.storageBin, 'Storage Bin');
      const materialCode = identifier(line.materialCode, 'Material');
      const batch = identifier(line.batch, 'Batch');
      const key = stockKey(storageBin, materialCode, batch);
      if (keys.has(key))
        throw new Error(
          'Duplicate Storage Bin + Material + Batch in the reservation request.',
        );
      const soNumber = line.soNumber?.trim() || null;
      if (soNumber && soNumber.length > 100)
        throw new Error('SO Number exceeds 100 characters.');
      result.push({
        rowNo,
        storageBin,
        materialCode,
        batch,
        qty: quantity(line.qty, true),
        soNumber,
      });
      keys.add(key);
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

export async function parseReservationFile(
  filePath: string,
): Promise<ReservationInput[]> {
  const book = await workbook(filePath);
  let chosen: {
    sheet: ExcelJS.Worksheet;
    header: number;
    bin: number;
    material: number;
    batch: number;
    qty: number;
    so: number | null;
  } | null = null;
  for (const sheet of book.worksheets.filter(
    (s) => s.state !== 'hidden' && s.state !== 'veryHidden',
  )) {
    for (let header = 1; header <= Math.min(sheet.rowCount, 30); header++) {
      const columns = new Map<string, number>();
      sheet
        .getRow(header)
        .eachCell((cell, column) =>
          columns.set(normaliseHeader(cellToText(cell.value)), column),
        );
      const bin =
        columns.get('storagebin') ?? columns.get('bin') ?? columns.get('binno');
      const material = columns.get('material') ?? columns.get('materialcode');
      const batch = columns.get('batch');
      const qty =
        columns.get('reqqty') ?? columns.get('qty') ?? columns.get('quantity');
      if (bin && material && batch && qty) {
        chosen = {
          sheet,
          header,
          bin,
          material,
          batch,
          qty,
          so:
            columns.get('sonumber') ??
            columns.get('so') ??
            columns.get('sono') ??
            null,
        };
        break;
      }
    }
    if (chosen) break;
  }
  if (!chosen)
    throw new BadRequestException(
      'A sheet with Storage Bin, Material, Batch and Qty / Req Qty columns is required.',
    );
  const { sheet, header, bin, material, batch, qty, so } = chosen;
  let defaultSo: string | null = null;
  for (let i = 1; i < header; i++) {
    sheet.getRow(i).eachCell((cell, column) => {
      if (
        ['requiredso', 'sonumber', 'sono', 'so'].includes(
          normaliseHeader(cellToText(cell.value)),
        )
      ) {
        defaultSo =
          cellToText(sheet.getRow(i).getCell(column + 1).value) || null;
      }
    });
  }
  const lines: {
    storageBin: string;
    materialCode: string;
    batch: string;
    qty: string;
    soNumber: string | null;
    rowNo: number;
  }[] = [];
  for (let rowNo = header + 1; rowNo <= sheet.rowCount; rowNo++) {
    const row = sheet.getRow(rowNo);
    const values = [bin, material, batch, qty, ...(so ? [so] : [])].map(
      (column) => cellToText(row.getCell(column).value),
    );
    if (!values.some(Boolean)) continue;
    lines.push({
      rowNo,
      storageBin: values[0],
      materialCode: values[1],
      batch: values[2],
      qty: values[3],
      soNumber: (so ? cellToText(row.getCell(so).value) : '') || defaultSo,
    });
  }
  return normalizeReservationLines(lines);
}
