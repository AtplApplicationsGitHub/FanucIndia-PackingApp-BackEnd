import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BOM_AUDIT_STATUS_VALUES } from '../bom-audit.constants';
import { AUDIT_STATUS_FILTER_ALL, toStatusFilter } from '../../shared/audit.constants';

const trimOrUndefined = ({ value }: { value: unknown }) =>
  value === undefined || value === null || String(value).trim() === ''
    ? undefined
    : String(value).trim();

export class QueryBomAuditDto {
  @ApiPropertyOptional({
    description: 'Search by Audit No, audit name, file name, operator name or storage bin',
    example: 'AUD-BOM-2026',
  })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by audit status. Not sent or "ALL" = every status (default)',
    enum: [AUDIT_STATUS_FILTER_ALL, ...BOM_AUDIT_STATUS_VALUES],
  })
  @Transform(({ value }) => toStatusFilter(value))
  @IsOptional()
  @IsIn(BOM_AUDIT_STATUS_VALUES, {
    message: `status must be ALL or one of: ${BOM_AUDIT_STATUS_VALUES.join(', ')}`,
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Upload date from (YYYY-MM-DD, IST)',
    example: '2026-10-01',
  })
  @Transform(trimOrUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fromDate must be in YYYY-MM-DD format',
  })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Upload date to (YYYY-MM-DD, IST, inclusive)',
    example: '2026-10-31',
  })
  @Transform(trimOrUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'toDate must be in YYYY-MM-DD format',
  })
  toDate?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
