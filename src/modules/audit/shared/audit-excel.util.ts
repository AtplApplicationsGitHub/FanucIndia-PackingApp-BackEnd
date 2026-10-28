import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { AUDIT_MAX_FILE_NAME_LENGTH } from './audit.constants';

const INVISIBLE_CHARS = /[​-‍⁠﻿]/g;
const NBSP = / /g;

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
  const name = decoded.includes('�') ? originalName : decoded;
  return cleanText(name).slice(0, AUDIT_MAX_FILE_NAME_LENGTH);
}

export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}
