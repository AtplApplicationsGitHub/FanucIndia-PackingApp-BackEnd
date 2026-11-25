import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CellValue, Workbook } from 'exceljs';
import { Prisma } from '@prisma/client';
import { cellToText } from '../shared/audit-excel.util';

export const IBD_PRINT_HEADER_KEYS = {
  inboundDelivery: 'IBD_PRINT_COLUMN_INBOUND_DELIVERY',
  materialNumber: 'IBD_PRINT_COLUMN_MATERIAL_NUMBER',
  materialDescription: 'IBD_PRINT_COLUMN_MATERIAL_DESCRIPTION',
  customerName: 'IBD_PRINT_COLUMN_CUSTOMER_NAME',
  customerM: 'IBD_PRINT_COLUMN_CUSTOMER_M',
  filPurchase: 'IBD_PRINT_COLUMN_FIL_PURCHASE',
  fjOaNumber: 'IBD_PRINT_COLUMN_FJ_OA_NUMBER',
  fjInvoice: 'IBD_PRINT_COLUMN_FJ_INVOICE',
  invoiceDate: 'IBD_PRINT_COLUMN_INVOICE_DATE',
  caseNumber: 'IBD_PRINT_COLUMN_CASE_NUMBER',
  filSoNumber: 'IBD_PRINT_COLUMN_FIL_SO_NUMBER',
  weightKg: 'IBD_PRINT_COLUMN_WEIGHT_KG',
} as const;

export type IbdPrintField = keyof typeof IBD_PRINT_HEADER_KEYS;
export const IBD_PRINT_FIELDS = Object.keys(IBD_PRINT_HEADER_KEYS) as IbdPrintField[];

export const IBD_PRINT_DEFAULT_HEADERS: Record<IbdPrintField, string> = {
  inboundDelivery: 'Inbound   De',
  materialNumber: 'Material N',
  materialDescription: 'Material D',
  customerName: 'Customer Name',
  customerM: 'Customer M',
  filPurchase: 'FIL Purcha',
  fjOaNumber: 'FJ OA Numb',
  fjInvoice: 'FJ Invoice',
  invoiceDate: 'Invoice Da',
  caseNumber: 'Case Numbe',
  filSoNumber: 'FIL SO Num',
  weightKg: 'WEIGHT (Kg',
};

function readCell(value: CellValue): string | null {
  if (value && typeof value === 'object') {
    if ('error' in value) return value.error;
    if ('formula' in value || 'sharedFormula' in value) {
      return readCell(value.result);
    }
  }
  // PostgreSQL text does not support NUL characters.
  const text = typeof value === 'string' ? value : cellToText(value);
  return text.split('\0').join('') || null;
}

export async function readIbdPrintWorkbook(
  buffer: Buffer,
  headers: Record<IbdPrintField, string>,
): Promise<Prisma.IbdPrintRowCreateManyUploadInput[]> {
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch {
    throw new BadRequestException('The uploaded file could not be read as an .xlsx workbook.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The workbook must contain a worksheet.');

  const fieldByHeader = new Map(IBD_PRINT_FIELDS.map((field) => [headers[field], field]));
  if (fieldByHeader.size !== IBD_PRINT_FIELDS.length || Object.values(headers).some((text) => !text.trim())) {
    throw new InternalServerErrorException('IBD Print requires a unique, nonblank header in SystemConfig for each column.');
  }

  const columns = new Map<IbdPrintField, number>();
  const unexpectedHeaders = new Set<string>();
  const duplicateHeaders = new Set<string>();
  sheet.getRow(1).eachCell((cell, column) => {
    const name = cell.text;
    if (name === '') return;

    const field = fieldByHeader.get(name);
    if (!field) {
      unexpectedHeaders.add(name);
    } else if (columns.has(field)) {
      duplicateHeaders.add(name);
    } else {
      columns.set(field, column);
    }
  });

  const missingHeaders = IBD_PRINT_FIELDS
    .filter((field) => !columns.has(field))
    .map((field) => headers[field]);
  if (missingHeaders.length || unexpectedHeaders.size || duplicateHeaders.size) {
    throw new BadRequestException({
      code: 'IBD_PRINT_INVALID_HEADERS',
      message: 'Row 1 must contain each configured IBD Print header exactly once. Check spelling, capitalization, spacing, and punctuation.',
      details: {
        missingHeaders,
        unexpectedHeaders: [...unexpectedHeaders],
        duplicateHeaders: [...duplicateHeaders],
      },
    });
  }

  const rows: Prisma.IbdPrintRowCreateManyUploadInput[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data: Prisma.IbdPrintRowCreateManyUploadInput = { rowNumber };
    for (const [field, column] of columns) {
      data[field] = readCell(row.getCell(column).value);
    }
    rows.push(data);
  });
  return rows;
}
