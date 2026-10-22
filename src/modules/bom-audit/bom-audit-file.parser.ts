import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { Readable } from 'stream';
import {
  BOM_AUDIT_ALLOWED_EXTENSIONS,
  BOM_AUDIT_COLUMN_LABELS,
  BOM_AUDIT_HEADER_ALIASES,
  BOM_AUDIT_MAX_DATA_ROWS,
  BOM_AUDIT_MAX_LENGTH,
  BOM_AUDIT_MAX_REPORTED_ERRORS,
  BOM_AUDIT_HEADER_SEARCH_ROWS,
  BOM_AUDIT_NAME_LABEL,
  BOM_AUDIT_OPTIONAL_HEADER_ALIASES,
} from './bom-audit.constants';

type FieldKey = keyof typeof BOM_AUDIT_HEADER_ALIASES;
type OptionalFieldKey = keyof typeof BOM_AUDIT_OPTIONAL_HEADER_ALIASES;

export interface BomAuditRowError {
  rowNo: number;
  errors: string[];
}

export interface ParsedBomAuditMaterial {
  materialCode: string;
  expectedQty: number;
}

export interface ParsedBomAuditLocation {
  storageBin: string;
  materials: ParsedBomAuditMaterial[];
  operatorLabel?: string;
  firstRowNo?: number;
}

export interface BomAuditParseResult {
  auditName: string | null;
  hasOperatorColumn: boolean;
  locations: ParsedBomAuditLocation[];
  totalLocations: number;
  totalMaterials: number;
  totalRows: number;
  mergedRows: number;
}

export class BomAuditFileError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly rowErrors: BomAuditRowError[] = [],
    readonly totalRowErrors = 0,
  ) {
    super(message);
    this.name = 'BomAuditFileError';
  }
}

const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;
const NBSP = /\u00A0/g;

export function cleanText(value: string): string {
  return value.replace(INVISIBLE_CHARS, '').replace(NBSP, ' ').trim();
}

export function normaliseHeader(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function cellToText(value: ExcelJS.CellValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toFixed(0)
      : cleanText(String(value));
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return cleanText(value.richText.map((part) => part.text).join(''));
    }
    if ('result' in value) {
      return cellToText(value.result as ExcelJS.CellValue);
    }
    if ('text' in value && typeof value.text === 'string') {
      return cleanText(value.text);
    }
    if ('error' in value) return '';
  }
  return cleanText(String(value));
}

export function decodeUploadFileName(originalName: string): string {
  const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
  const name = decoded.includes('\uFFFD') ? originalName : decoded;
  return cleanText(name).slice(0, BOM_AUDIT_MAX_LENGTH.fileName);
}

export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

async function loadWorksheet(
  buffer: Buffer,
  extension: string,
): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  try {
    if (extension === '.csv') {
      await workbook.csv.read(Readable.from(buffer), {
        map: (value: unknown) => value,
      } as never);
    } else {
      await workbook.xlsx.load(buffer as never);
    }
  } catch {
    throw new BomAuditFileError(
      'The file could not be read. Please upload a valid .xlsx or .csv file.',
      'INVALID_FILE',
    );
  }

  const worksheet = workbook.worksheets.find((ws) => ws.actualRowCount > 0);
  if (!worksheet) {
    throw new BomAuditFileError('The uploaded file is empty.', 'EMPTY_FILE');
  }
  return worksheet;
}

function locateColumns(worksheet: ExcelJS.Worksheet): {
  headerRowNo: number;
  columns: Record<FieldKey, number>;
  optionalColumns: Partial<Record<OptionalFieldKey, number>>;
} {
  let firstRow: ExcelJS.Row | undefined;
  let best: { row: ExcelJS.Row; index: Map<string, number>; found: number } | undefined;
  const requiredCount = Object.keys(BOM_AUDIT_HEADER_ALIASES).length;

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.number > BOM_AUDIT_HEADER_SEARCH_ROWS) return;
    if (!firstRow) firstRow = row;
    const index = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = normaliseHeader(cellToText(cell.value));
      if (key && !index.has(key)) index.set(key, colNumber);
    });
    const found = (Object.keys(BOM_AUDIT_HEADER_ALIASES) as FieldKey[]).filter((field) =>
      BOM_AUDIT_HEADER_ALIASES[field].some((alias) => index.has(alias)),
    ).length;
    if (best && best.found === requiredCount) return;
    if (!best || found > best.found) best = { row, index, found };
  });
  if (!firstRow || !best) {
    throw new BomAuditFileError('The uploaded file is empty.', 'EMPTY_FILE');
  }

  const headerIndex = best.index;
  const columns = {} as Record<FieldKey, number>;
  const missing: string[] = [];
  (Object.keys(BOM_AUDIT_HEADER_ALIASES) as FieldKey[]).forEach((field) => {
    const col = BOM_AUDIT_HEADER_ALIASES[field]
      .map((alias) => headerIndex.get(alias))
      .find((c) => c !== undefined);
    if (col === undefined) missing.push(BOM_AUDIT_COLUMN_LABELS[field]);
    else columns[field] = col;
  });

  if (missing.length) {
    throw new BomAuditFileError(
      `Required column(s) missing: ${missing.join(', ')}. ` +
        `The file must have the columns Material Code, Storage and Qty in the header row.`,
      'MISSING_COLUMNS',
    );
  }

  const optionalColumns: Partial<Record<OptionalFieldKey, number>> = {};
  (Object.keys(BOM_AUDIT_OPTIONAL_HEADER_ALIASES) as OptionalFieldKey[]).forEach((field) => {
    const col = BOM_AUDIT_OPTIONAL_HEADER_ALIASES[field]
      .map((alias) => headerIndex.get(alias))
      .find((c) => c !== undefined);
    if (col !== undefined) optionalColumns[field] = col;
  });

  return { headerRowNo: best.row.number, columns, optionalColumns };
}

function readAuditNameAbove(worksheet: ExcelJS.Worksheet, headerRowNo: number): string | null {
  for (let rowNo = 1; rowNo < headerRowNo; rowNo++) {
    const row = worksheet.getRow(rowNo);
    let labelCol = 0;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (!labelCol && normaliseHeader(cellToText(cell.value)) === BOM_AUDIT_NAME_LABEL) labelCol = colNumber;
    });
    if (labelCol) return cleanAuditName(cellToText(row.getCell(labelCol + 1).value));
  }
  return null;
}

const cleanAuditName = (value: string) => cleanText(value).replace(/\s+/g, ' ');

function parseQty(raw: string): number | null {
  const text = raw.replace(/,/g, '');
  if (!/^\d+(\.0+)?$/.test(text)) return null;
  const qty = Number(text);
  if (!Number.isSafeInteger(qty) || qty <= 0) return null;
  return qty;
}

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

export async function parseBomAuditFile(
  buffer: Buffer,
  fileName: string,
): Promise<BomAuditParseResult> {
  const extension = getFileExtension(fileName);
  if (!BOM_AUDIT_ALLOWED_EXTENSIONS.includes(extension)) {
    throw new BomAuditFileError(
      `Unsupported file type "${extension || 'unknown'}". Please upload a .xlsx or .csv file.`,
      'INVALID_FILE_TYPE',
    );
  }

  const worksheet = await loadWorksheet(buffer, extension);
  const { headerRowNo, columns, optionalColumns } = locateColumns(worksheet);
  const hasOperatorColumn = optionalColumns.operator !== undefined;

  let auditName = readAuditNameAbove(worksheet, headerRowNo);
  const auditNamesInColumn = new Set<string>();

  const binOperator = new Map<string, { label: string; key: string; rowNo: number }>();

  const grouped = new Map<string, Map<string, number>>();
  const rowErrors: BomAuditRowError[] = [];
  let totalRowErrors = 0;
  let totalRows = 0;
  let mergedRows = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNo) => {
    if (rowNo <= headerRowNo) return;

    const materialCode = cellToText(
      row.getCell(columns.materialCode).value,
    ).toUpperCase();
    const storageBin = cellToText(
      row.getCell(columns.storageBin).value,
    ).toUpperCase();
    const qtyText = cellToText(row.getCell(columns.qty).value);
    const operatorLabel = hasOperatorColumn
      ? cleanText(cellToText(row.getCell(optionalColumns.operator as number).value)).replace(/\s+/g, ' ')
      : '';

    if (!materialCode && !storageBin && !qtyText) return;

    if (optionalColumns.auditName !== undefined) {
      const name = cleanAuditName(cellToText(row.getCell(optionalColumns.auditName).value));
      if (name) auditNamesInColumn.add(name);
    }

    totalRows += 1;
    if (totalRows > BOM_AUDIT_MAX_DATA_ROWS) return;

    const errors: string[] = [];
    if (!materialCode) {
      errors.push(`${BOM_AUDIT_COLUMN_LABELS.materialCode} is missing`);
    } else if (materialCode.length > BOM_AUDIT_MAX_LENGTH.materialCode) {
      errors.push(
        `${BOM_AUDIT_COLUMN_LABELS.materialCode} is longer than ${BOM_AUDIT_MAX_LENGTH.materialCode} characters`,
      );
    }

    if (!storageBin) {
      errors.push(`${BOM_AUDIT_COLUMN_LABELS.storageBin} is missing`);
    } else if (storageBin.length > BOM_AUDIT_MAX_LENGTH.storageBin) {
      errors.push(
        `${BOM_AUDIT_COLUMN_LABELS.storageBin} is longer than ${BOM_AUDIT_MAX_LENGTH.storageBin} characters`,
      );
    }

    const qty = qtyText ? parseQty(qtyText) : null;
    if (!qtyText) {
      errors.push(`${BOM_AUDIT_COLUMN_LABELS.qty} is missing`);
    } else if (qty === null) {
      errors.push(
        `${BOM_AUDIT_COLUMN_LABELS.qty} "${qtyText}" must be a whole number greater than 0`,
      );
    }

    if (hasOperatorColumn) {
      if (!operatorLabel) {
        errors.push('Operator is missing (select one from the dropdown)');
      } else if (operatorLabel.length > BOM_AUDIT_MAX_LENGTH.operator) {
        errors.push(`Operator is longer than ${BOM_AUDIT_MAX_LENGTH.operator} characters`);
      } else if (storageBin) {
        const key = operatorLabel.toLowerCase();
        const assigned = binOperator.get(storageBin);
        if (!assigned) {
          binOperator.set(storageBin, { label: operatorLabel, key, rowNo });
        } else if (assigned.key !== key) {
          errors.push(
            `Storage bin ${storageBin} is already assigned to "${assigned.label}" (row ${assigned.rowNo}). One storage bin can have only one operator`,
          );
        }
      }
    }

    if (errors.length) {
      totalRowErrors += 1;
      if (rowErrors.length < BOM_AUDIT_MAX_REPORTED_ERRORS) {
        rowErrors.push({ rowNo, errors });
      }
      return;
    }

    let materials = grouped.get(storageBin);
    if (!materials) {
      materials = new Map<string, number>();
      grouped.set(storageBin, materials);
    }
    const existingQty = materials.get(materialCode);
    if (existingQty !== undefined) mergedRows += 1;
    materials.set(materialCode, (existingQty ?? 0) + (qty as number));
  });

  if (totalRows > BOM_AUDIT_MAX_DATA_ROWS) {
    throw new BomAuditFileError(
      `The file has ${totalRows} data rows. Maximum allowed is ${BOM_AUDIT_MAX_DATA_ROWS} rows per audit.`,
      'TOO_MANY_ROWS',
    );
  }

  if (totalRowErrors > 0) {
    const shown =
      totalRowErrors > rowErrors.length
        ? ` (showing the first ${rowErrors.length})`
        : '';
    throw new BomAuditFileError(
      `${totalRowErrors} row(s) have invalid data${shown}. Please correct the file and upload again.`,
      'INVALID_FILE_DATA',
      rowErrors,
      totalRowErrors,
    );
  }

  if (totalRows === 0) {
    throw new BomAuditFileError(
      'The file has no data rows below the header.',
      'NO_DATA_ROWS',
    );
  }

  if (auditNamesInColumn.size > 1) {
    throw new BomAuditFileError(
      `The Audit Name column has ${auditNamesInColumn.size} different values (${[...auditNamesInColumn]
        .slice(0, 3)
        .join(', ')}). One file can have only one Audit Name.`,
      'MULTIPLE_AUDIT_NAMES',
    );
  }
  if (auditName === null && auditNamesInColumn.size === 1) {
    auditName = [...auditNamesInColumn][0];
  } else if (auditName === '' && auditNamesInColumn.size === 1) {
    auditName = [...auditNamesInColumn][0];
  }

  const locations: ParsedBomAuditLocation[] = [...grouped.entries()]
    .sort(([a], [b]) => naturalCompare(a, b))
    .map(([storageBin, materials]) => ({
      storageBin,
      materials: [...materials.entries()]
        .sort(([a], [b]) => naturalCompare(a, b))
        .map(([materialCode, expectedQty]) => ({ materialCode, expectedQty })),
      ...(hasOperatorColumn
        ? {
            operatorLabel: binOperator.get(storageBin)?.label,
            firstRowNo: binOperator.get(storageBin)?.rowNo,
          }
        : {}),
    }));

  return {
    auditName,
    hasOperatorColumn,
    locations,
    totalLocations: locations.length,
    totalMaterials: locations.reduce((sum, l) => sum + l.materials.length, 0),
    totalRows,
    mergedRows,
  };
}
