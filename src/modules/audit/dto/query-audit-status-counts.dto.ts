import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { AUDIT_TYPE_VALUES } from '../shared/audit.constants';

const trimOrUndefined = ({ value }: { value: unknown }) =>
  value === undefined || value === null || String(value).trim() === ''
    ? undefined
    : String(value).trim();

export class QueryAuditStatusCountsDto {
  @ApiPropertyOptional({
    description: 'Only this audit type (leave empty for all 4)',
    enum: AUDIT_TYPE_VALUES,
  })
  @Transform(({ value }) => trimOrUndefined({ value })?.toUpperCase())
  @IsOptional()
  @IsIn(AUDIT_TYPE_VALUES, {
    message: `auditType must be one of: ${AUDIT_TYPE_VALUES.join(', ')}`,
  })
  auditType?: string;

  @ApiPropertyOptional({
    description: 'Audit created date from (YYYY-MM-DD, IST)',
    example: '2026-10-01',
  })
  @Transform(trimOrUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fromDate must be in YYYY-MM-DD format',
  })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Audit created date to (YYYY-MM-DD, IST, inclusive)',
    example: '2026-10-31',
  })
  @Transform(trimOrUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'toDate must be in YYYY-MM-DD format',
  })
  toDate?: string;
}
