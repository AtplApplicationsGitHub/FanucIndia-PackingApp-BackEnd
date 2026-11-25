import { InternalServerErrorException } from '@nestjs/common';
import type { IbdPrintRow } from '@prisma/client';

const PLACEHOLDERS = [
  'materialDescription', 'customerName', 'customerM', 'fjOaQr', 'fjOaNumber',
  'filPurchase', 'invoiceDate', 'fjInvoice', 'caseNumber', 'weightKg',
  'filSoQr', 'filSoNumber', 'quantity',
] as const;
type Placeholder = (typeof PLACEHOLDERS)[number];

const TOKEN = /@@([A-Za-z]\w*)@@/g;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function displayDate(value: string | null) {
  if (!value) return '';
  const iso = /^(\d{4})-(0[1-9]|1[0-2])-(\d{2})(?:T\d{2}:\d{2}:\d{2}\.\d{3}Z)?$/.exec(value);
  if (!iso) return value;
  const [, year, month, day] = iso;
  return `${day}.${MONTHS[Number(month) - 1]}.${year}`;
}

function labelValue(prefix: string, value: string | null) {
  return value ? prefix + value : '';
}

// ^FH uses underscore as its escape marker. Escape command prefixes, that
// marker, and non-printable bytes before putting spreadsheet data in ^FD.
function zplField(value: string) {
  let encoded = '';
  for (const byte of Buffer.from(value, 'utf8')) {
    if (byte < 32 || byte > 126 || byte === 94 || byte === 95 || byte === 126) {
      encoded += '_' + byte.toString(16).padStart(2, '0').toUpperCase();
    } else {
      encoded += String.fromCharCode(byte);
    }
  }
  return encoded;
}

function rowFields(row: IbdPrintRow, quantity: number): Record<Placeholder, string> {
  const weight = row.weightKg?.trim();
  const weightWithUnit = weight && !/kg$/i.test(weight) ? `${weight} KG` : weight;
  return {
    materialDescription: zplField(row.materialDescription ?? ''),
    customerName: zplField(row.customerName ?? ''),
    customerM: zplField(row.customerM ?? ''),
    fjOaQr: zplField(row.fjOaNumber ?? ''),
    fjOaNumber: zplField(row.fjOaNumber ?? ''),
    filPurchase: zplField(labelValue('IMPD - ', row.filPurchase)),
    invoiceDate: zplField(displayDate(row.invoiceDate)),
    fjInvoice: zplField(labelValue('Inv. ', row.fjInvoice)),
    caseNumber: zplField(labelValue('Case No. ', row.caseNumber)),
    weightKg: zplField(labelValue('Weight : ', weightWithUnit ?? null)),
    filSoQr: zplField(row.filSoNumber ?? ''),
    filSoNumber: zplField(row.filSoNumber ?? ''),
    quantity: String(quantity),
  };
}

export function renderIbdPrn(template: string, rows: readonly IbdPrintRow[], quantity: number): string {
  const format = template.trim();
  const lines = format.split(/\r?\n/);
  const placeholders = new Set(Array.from(format.matchAll(TOKEN), ([, name]) => name));
  if (
    !format.startsWith('^XA') || !format.endsWith('^XZ') ||
    format.match(/\^XA/g)?.length !== 1 || format.match(/\^XZ/g)?.length !== 1 ||
    format.match(/\^PQ/g)?.length !== 1 || !format.includes('^PQ@@quantity@@') ||
    placeholders.size !== PLACEHOLDERS.length || PLACEHOLDERS.some((name) => !placeholders.has(name))
  ) {
    throw new InternalServerErrorException('The SFTP IBD PRN template must contain one ZPL label format and all required placeholders.');
  }

  for (const marker of ['@@fjOaQr@@', '@@filSoQr@@']) {
    const qrLines = lines.filter((line) => line.includes(marker));
    if (
      qrLines.length !== 1 || !qrLines[0].trimStart().startsWith('^FO') ||
      !qrLines[0].includes('^BQ') || !qrLines[0].trimEnd().endsWith('^FS') ||
      qrLines[0].match(/\^FS/g)?.length !== 1 || qrLines[0].match(TOKEN)?.length !== 1
    ) {
      throw new InternalServerErrorException('Each QR placeholder must be on its own ZPL field line in the SFTP IBD PRN template.');
    }
  }

  return rows.map((row) => {
    const fields = rowFields(row, quantity);
    return lines
      .filter((line) => (fields.fjOaQr || !line.includes('@@fjOaQr@@')) &&
        (fields.filSoQr || !line.includes('@@filSoQr@@')))
      .map((line) => line.replace(TOKEN, (_, name: Placeholder) => fields[name]))
      .join('\n');
  }).join('\n') + '\n';
}
