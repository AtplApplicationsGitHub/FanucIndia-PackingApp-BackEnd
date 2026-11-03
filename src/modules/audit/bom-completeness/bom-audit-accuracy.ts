import { BOM_AUDIT_LINE_STATUS } from './bom-audit.constants';

export interface AccuracyLine {
  expectedQty: number;
  actualQty: number | null;
  lineStatus: string | null;
  isUnexpected: boolean;
}

export interface BomAuditAccuracy {
  /** Valid lines / (expected lines + unexpected lines) x 100. null = nothing to judge yet */
  lineAccuracy: number | null;
  /** 1 - (sum of |scanned - expected| pieces) / (sum of expected pieces), never below 0. null = nothing expected */
  qtyAccuracy: number | null;
}

const floorToOneDecimal = (value: number) => Math.floor(value * 10 + 1e-9) / 10;

export function calculateBomAuditAccuracy(lines: AccuracyLine[]): BomAuditAccuracy {
  let expectedLines = 0;
  let unexpectedLines = 0;
  let validLines = 0;
  let expectedPieces = 0;
  let wrongPieces = 0;

  for (const line of lines) {
    if (line.lineStatus === null) continue;
    const actual = line.actualQty ?? 0;

    if (line.isUnexpected || line.lineStatus === BOM_AUDIT_LINE_STATUS.UNEXPECTED) {
      if (actual < 1) continue;
      unexpectedLines += 1;
      wrongPieces += actual;
      continue;
    }

    expectedLines += 1;
    expectedPieces += line.expectedQty;
    wrongPieces += Math.abs(actual - line.expectedQty);
    if (line.lineStatus === BOM_AUDIT_LINE_STATUS.VALID) validLines += 1;
  }

  const judgedLines = expectedLines + unexpectedLines;

  return {
    lineAccuracy: judgedLines === 0 ? null : floorToOneDecimal((validLines / judgedLines) * 100),
    qtyAccuracy:
      expectedPieces === 0
        ? null
        : floorToOneDecimal(Math.max(0, 1 - wrongPieces / expectedPieces) * 100),
  };
}
