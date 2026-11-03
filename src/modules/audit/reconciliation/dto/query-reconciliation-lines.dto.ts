import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  RECON_CATEGORY,
  RECON_CATEGORY_VALUES,
  RECON_LINES_DEFAULT_LIMIT,
  RECON_LINES_MAX_LIMIT,
  RECON_LINE_STATUS_FILTER,
  RECON_LINE_STATUS_FILTER_VALUES,
} from '../../bom-completeness/bom-reconciliation.service';

const trimOrUndefined = ({ value }: { value: unknown }) =>
  value === undefined || value === null || String(value).trim() === ''
    ? undefined
    : String(value).trim();

export class QueryReconciliationLinesDto {
  @ApiPropertyOptional({ description: 'Search by storage bin or material code', example: 'A06B' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Only this storage bin', example: '15-C-22' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  storageBin?: string;

  @ApiPropertyOptional({
    description:
      'ALL = every line (incl. Valid and, while In Progress, locations not uploaded yet); ALL_EXCEPT_VALID = discrepancies only',
    enum: RECON_CATEGORY_VALUES,
    default: RECON_CATEGORY.ALL,
  })
  @Transform(({ value }) => trimOrUndefined({ value })?.toUpperCase())
  @IsOptional()
  @IsIn(RECON_CATEGORY_VALUES, {
    message: `category must be one of: ${RECON_CATEGORY_VALUES.join(', ')}`,
  })
  category?: string;

  @ApiPropertyOptional({
    description: 'OPEN / RESOLVED = discrepancies with that review status only',
    enum: RECON_LINE_STATUS_FILTER_VALUES,
    default: RECON_LINE_STATUS_FILTER.ALL,
  })
  @Transform(({ value }) => trimOrUndefined({ value })?.toUpperCase())
  @IsOptional()
  @IsIn(RECON_LINE_STATUS_FILTER_VALUES, {
    message: `status must be one of: ${RECON_LINE_STATUS_FILTER_VALUES.join(', ')}`,
  })
  status?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: RECON_LINES_DEFAULT_LIMIT, minimum: 1, maximum: RECON_LINES_MAX_LIMIT })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(RECON_LINES_MAX_LIMIT)
  limit?: number;
}
