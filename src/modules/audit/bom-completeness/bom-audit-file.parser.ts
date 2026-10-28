import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import {
  cellToText,
  getFileExtension,
  normaliseHeader,
} from '../shared/audit-excel.util';
import {
  BOM_AUDIT_ALLOWED_EXTENSIONS,
  BOM_AUDIT_COLUMN_LABELS,
  BOM_AUDIT_HEADER_ALIASES,
  BOM_AUDIT_MAX_DATA_ROWS,
  BOM_AUDIT_MAX_LENGTH,
  BOM_AUDIT_MAX_REPORTED_ERRORS,
  BOM_AUDIT_HEADER_SEARCH_ROWS,
  BOM_AUDIT_MAX_OPERATOR_ID,
} from './bom-audit.constants';

type FieldKey = keyof typeof BOM_AUDIT_HEADER_ALIASES;

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
  operatorId: number;
  firstRowNo: number;
}

export interface BomAuditParseResult {
  locations: ParsedBomAuditLocation[];
  operatorRows: Map<number, number[]>;
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

  const worksheet = workbook.worksheets.find(
    (ws) => ws.actualRowCount > 0 && ws.state !== 'hidden' && ws.state !== 'veryHidden',
  );
  if (!worksheet) {
    throw new BomAuditFileError('The uploaded file is empty.', 'EMPTY_FILE');
  }
  return worksheet;
}

function locateColumns(worksheet: ExcelJS.Worksheet): {
  headerRowNo: number;
  columns: Record<FieldKey, number>;
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
        `The file must have the columns StorageBin, Material, Qty (or Avail) and Operator in the header row.`,
      'MISSING_COLUMNS',
    );
  }

  return { headerRowNo: best.row.number, columns };
}

function parseQty(raw: string): number | null {
  const text = raw.replace(/,/g, '');
  if (!/^\d+(\.0+)?$/.test(text)) return null;
  const qty = Number(text);
  if (!Number.isSafeInteger(qty) || qty <= 0) return null;
  return qty;
}

function parseOperatorId(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+(\.0+)?$/.test(text)) return null;
  const id = Number(text);
  if (!Number.isSafeInteger(id) || id <= 0 || id > BOM_AUDIT_MAX_OPERATOR_ID) return null;
  return id;
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
  const { headerRowNo, columns } = locateColumns(worksheet);

  const binOperator = new Map<string, { operatorId: number; rowNo: number }>();
  const operatorRows = new Map<number, number[]>();

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
    const operatorText = cellToText(row.getCell(columns.operatorId).value);

    if (!materialCode && !storageBin && !qtyText && !operatorText) return;

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

    const operatorId = operatorText ? parseOperatorId(operatorText) : null;
    if (!operatorText) {
      errors.push(`${BOM_AUDIT_COLUMN_LABELS.operatorId} is missing (enter the Operator ID)`);
    } else if (operatorId === null) {
      errors.push(
        `${BOM_AUDIT_COLUMN_LABELS.operatorId} "${operatorText}" must be the Operator ID (a whole number, e.g. 12)`,
      );
    } else if (storageBin) {
      const assigned = binOperator.get(storageBin);
      if (!assigned) {
        binOperator.set(storageBin, { operatorId, rowNo });
      } else if (assigned.operatorId !== operatorId) {
        errors.push(
          `Storage bin ${storageBin} is already assigned to Operator ID ${assigned.operatorId} (row ${assigned.rowNo}). One storage bin can have only one operator`,
        );
      }
    }

    if (errors.length) {
      totalRowErrors += 1;
      if (rowErrors.length < BOM_AUDIT_MAX_REPORTED_ERRORS) {
        rowErrors.push({ rowNo, errors });
      }
      return;
    }

    const rows = operatorRows.get(operatorId as number);
    if (rows) rows.push(rowNo);
    else operatorRows.set(operatorId as number, [rowNo]);

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
      `The file has ${totalRows} data rows. Maximum allowed is ${BOM_AUDIT_MAX_DATA_ROWS} rows per upload.`,
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

  const locations: ParsedBomAuditLocation[] = [...grouped.entries()]
    .sort(([a], [b]) => naturalCompare(a, b))
    .map(([storageBin, materials]) => ({
      storageBin,
      materials: [...materials.entries()]
        .sort(([a], [b]) => naturalCompare(a, b))
        .map(([materialCode, expectedQty]) => ({ materialCode, expectedQty })),
      operatorId: binOperator.get(storageBin)!.operatorId,
      firstRowNo: binOperator.get(storageBin)!.rowNo,
    }));

  return {
    locations,
    operatorRows,
    totalLocations: locations.length,
    totalMaterials: locations.reduce((sum, l) => sum + l.materials.length, 0),
    totalRows,
    mergedRows,
  };
}
