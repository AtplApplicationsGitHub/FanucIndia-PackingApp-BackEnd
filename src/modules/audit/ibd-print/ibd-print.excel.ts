import { BadRequestException } from '@nestjs/common';
import { CellValue, Workbook } from 'exceljs';
import { Prisma } from '@prisma/client';
import { cellToText, normaliseHeader } from '../shared/audit-excel.util';

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

export const IBD_PRINT_DEFAULT_HEADERS: Record<IbdPrintField, readonly string[]> = {
  inboundDelivery: ['Inbound De', 'Inbound Delivery'],
  materialNumber: ['Material N', 'Material Number', 'Material No'],
  materialDescription: ['Material D', 'Material Description'],
  customerName: ['Customer Name'],
  customerM: ['Customer M'],
  filPurchase: ['FIL Purcha', 'FIL Purchase'],
  fjOaNumber: ['FJ OA Numb', 'FJ OA Number'],
  fjInvoice: ['FJ Invoice'],
  invoiceDate: ['Invoice Da', 'Invoice Date'],
  caseNumber: ['Case Numbe', 'Case Number'],
  filSoNumber: ['FIL SO Num', 'FIL SO Number'],
  weightKg: ['WEIGHT (Kg'],
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
  headers: Record<IbdPrintField, readonly string[]>,
): Promise<Prisma.IbdPrintRowCreateManyUploadInput[]> {
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch {
    throw new BadRequestException('The uploaded file could not be read as an .xlsx workbook.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The workbook must contain a worksheet.');

  const columnByHeader = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    const name = normaliseHeader(cell.text);
    if (name && !columnByHeader.has(name)) columnByHeader.set(name, column);
  });
  const mappings = IBD_PRINT_FIELDS.map((field) => {
    const header = headers[field].find((alias) => columnByHeader.has(alias));
    return { field, column: header === undefined ? undefined : columnByHeader.get(header) };
  });

  const rows: Prisma.IbdPrintRowCreateManyUploadInput[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data: Prisma.IbdPrintRowCreateManyUploadInput = { rowNumber };
    for (const { field, column } of mappings) {
      data[field] = column === undefined ? null : readCell(row.getCell(column).value);
    }
    rows.push(data);
  });
  return rows;
}
