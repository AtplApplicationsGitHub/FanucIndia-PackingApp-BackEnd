import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import {
  cellToText,
  cleanText,
  getFileExtension,
  normaliseHeader,
} from '../shared/audit-excel.util';
import {
  CYCLE_COUNT_ALLOWED_EXTENSIONS,
  CYCLE_COUNT_COLUMN_LABELS,
  CYCLE_COUNT_EXCLUDE_REASON,
  CYCLE_COUNT_HEADER_SEARCH_ROWS,
  CYCLE_COUNT_MATERIAL_CLASSES,
  CYCLE_COUNT_MAX_DATA_ROWS,
  CYCLE_COUNT_MAX_LENGTH,
  CYCLE_COUNT_MAX_QTY,
  CYCLE_COUNT_OPTIONAL_HEADERS,
  CYCLE_COUNT_REQUIRED_HEADERS,
} from './cycle-count.constants';

type RequiredKey = keyof typeof CYCLE_COUNT_REQUIRED_HEADERS;
type OptionalKey = keyof typeof CYCLE_COUNT_OPTIONAL_HEADERS;

export interface ParsedStockRow {
  rowNo: number;
  storageBin: string;
  materialCode: string;
  qty: number | null;
  certNo: string | null;
  batch: string | null;
  plant: string | null;
  storageLocation: string | null;
  isCnc: boolean | null;
  materialClass: string | null;
  excludeReason: string | null;
}

export interface StockParseResult {
  rows: ParsedStockRow[];
  totalRows: number;
  hasCertNoColumn: boolean;
  hasCncColumn: boolean;
  hasClassColumn: boolean;
}

export class CycleCountFileError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'CycleCountFileError';
  }
}

async function loadWorksheet(buffer: Buffer, extension: string): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  try {
    if (extension === '.csv') {
      await workbook.csv.read(Readable.from(buffer), { map: (value: unknown) => value } as never);
    } else {
      await workbook.xlsx.load(buffer as never);
    }
  } catch {
    throw new CycleCountFileError(
      'The file could not be read. Please upload a valid .xlsx or .csv export of LX03.',
      'INVALID_FILE',
    );
  }
  const worksheet = workbook.worksheets.find((ws) => ws.actualRowCount > 0 && ws.state === 'visible');
  if (!worksheet) {
    throw new CycleCountFileError('The uploaded file is empty.', 'EMPTY_FILE');
  }
  return worksheet;
}

function locateColumns(worksheet: ExcelJS.Worksheet) {
  const requiredKeys = Object.keys(CYCLE_COUNT_REQUIRED_HEADERS) as RequiredKey[];
  let best: { rowNo: number; index: Map<string, number>; found: number } | undefined;

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number > CYCLE_COUNT_HEADER_SEARCH_ROWS) return;
    if (best && best.found === requiredKeys.length) return;
    const index = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = normaliseHeader(cellToText(cell.value));
      if (key && !index.has(key)) index.set(key, colNumber);
    });
    const found = requiredKeys.filter((k) =>
      CYCLE_COUNT_REQUIRED_HEADERS[k].some((alias) => index.has(alias)),
    ).length;
    if (!best || found > best.found) best = { rowNo: row.number, index, found };
  });

  if (!best) throw new CycleCountFileError('The uploaded file is empty.', 'EMPTY_FILE');
  const headerIndex = best.index;
  const pick = (aliases: readonly string[]) =>
    aliases.map((a) => headerIndex.get(a)).find((c) => c !== undefined);

  const required = {} as Record<RequiredKey, number>;
  const missing: string[] = [];
  requiredKeys.forEach((key) => {
    const col = pick(CYCLE_COUNT_REQUIRED_HEADERS[key]);
    if (col === undefined) missing.push(CYCLE_COUNT_COLUMN_LABELS[key]);
    else required[key] = col;
  });
  if (missing.length) {
    throw new CycleCountFileError(
      `Required column(s) missing: ${missing.join(', ')}. Please upload the LX03 export (StorageBin, Material, Avail).`,
      'MISSING_COLUMNS',
    );
  }

  const optional: Partial<Record<OptionalKey, number>> = {};
  (Object.keys(CYCLE_COUNT_OPTIONAL_HEADERS) as OptionalKey[]).forEach((key) => {
    const col = pick(CYCLE_COUNT_OPTIONAL_HEADERS[key]);
    if (col !== undefined && !Object.values(required).includes(col)) optional[key] = col;
  });

  return { headerRowNo: best.rowNo, required, optional };
}

function parseQty(raw: string): number | null {
  const text = raw.replace(/,/g, '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const qty = Number(text);
  return Number.isFinite(qty) && Math.abs(qty) <= CYCLE_COUNT_MAX_QTY ? Math.round(qty * 1000) / 1000 : null;
}

function parseFlag(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (['yes', 'y', 'x', 'true', '1'].includes(v)) return true;
  if (['no', 'n', 'false', '0', '-'].includes(v)) return false;
  return null;
}

function parseClass(raw: string): string | null {
  const v = raw.trim().toUpperCase();
  return (CYCLE_COUNT_MATERIAL_CLASSES as readonly string[]).includes(v) ? v : null;
}

const textOrNull = (value: string, max: number) => (value ? value.slice(0, max) : null);

export async function parseCycleCountStockFile(buffer: Buffer, fileName: string): Promise<StockParseResult> {
  const extension = getFileExtension(fileName);
  if (!CYCLE_COUNT_ALLOWED_EXTENSIONS.includes(extension)) {
    throw new CycleCountFileError(
      `Unsupported file type "${extension || 'unknown'}". Please upload a .xlsx or .csv file.`,
      'INVALID_FILE_TYPE',
    );
  }

  const worksheet = await loadWorksheet(buffer, extension);
  const { headerRowNo, required, optional } = locateColumns(worksheet);
  const text = (row: ExcelJS.Row, col: number | undefined) =>
    col === undefined ? '' : cleanText(cellToText(row.getCell(col).value));

  const rows: ParsedStockRow[] = [];
  let totalRows = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNo) => {
    if (rowNo <= headerRowNo) return;

    const storageBin = text(row, required.storageBin).toUpperCase();
    const materialCode = text(row, required.materialCode).toUpperCase();
    const qtyText = text(row, required.qty);
    if (!storageBin && !materialCode && !qtyText) return;

    totalRows += 1;
    if (totalRows > CYCLE_COUNT_MAX_DATA_ROWS) return;

    const qty = qtyText ? parseQty(qtyText) : null;
    const certNo = text(row, optional.certNo).toUpperCase();
    const batch = text(row, optional.batch);

    let excludeReason: string | null = null;
    if (!storageBin) excludeReason = CYCLE_COUNT_EXCLUDE_REASON.NO_LOCATION;
    else if (!materialCode) excludeReason = CYCLE_COUNT_EXCLUDE_REASON.NO_MATERIAL;
    else if (qty === null) excludeReason = CYCLE_COUNT_EXCLUDE_REASON.INVALID_QTY;
    else if (qty <= 0) excludeReason = CYCLE_COUNT_EXCLUDE_REASON.ZERO_STOCK;
    else if (
      storageBin.length > CYCLE_COUNT_MAX_LENGTH.storageBin ||
      materialCode.length > CYCLE_COUNT_MAX_LENGTH.materialCode ||
      certNo.length > CYCLE_COUNT_MAX_LENGTH.certNo ||
      batch.length > CYCLE_COUNT_MAX_LENGTH.batch
    ) {
      excludeReason = CYCLE_COUNT_EXCLUDE_REASON.VALUE_TOO_LONG;
    }

    rows.push({
      rowNo,
      storageBin: storageBin.slice(0, CYCLE_COUNT_MAX_LENGTH.storageBin),
      materialCode: materialCode.slice(0, CYCLE_COUNT_MAX_LENGTH.materialCode),
      qty,
      certNo: textOrNull(certNo, CYCLE_COUNT_MAX_LENGTH.certNo),
      batch: textOrNull(batch, CYCLE_COUNT_MAX_LENGTH.batch),
      plant: textOrNull(text(row, optional.plant), CYCLE_COUNT_MAX_LENGTH.plant),
      storageLocation: textOrNull(text(row, optional.storageLocation), CYCLE_COUNT_MAX_LENGTH.storageLocation),
      isCnc: optional.cnc === undefined ? null : parseFlag(text(row, optional.cnc)),
      materialClass: optional.materialClass === undefined ? null : parseClass(text(row, optional.materialClass)),
      excludeReason,
    });
  });

  if (totalRows > CYCLE_COUNT_MAX_DATA_ROWS) {
    throw new CycleCountFileError(
      `The file has ${totalRows} data rows. Maximum allowed is ${CYCLE_COUNT_MAX_DATA_ROWS} rows.`,
      'TOO_MANY_ROWS',
    );
  }
  if (totalRows === 0) {
    throw new CycleCountFileError('The file has no data rows below the header.', 'NO_DATA_ROWS');
  }

  return {
    rows,
    totalRows,
    hasCertNoColumn: optional.certNo !== undefined,
    hasCncColumn: optional.cnc !== undefined,
    hasClassColumn: optional.materialClass !== undefined,
  };
}
