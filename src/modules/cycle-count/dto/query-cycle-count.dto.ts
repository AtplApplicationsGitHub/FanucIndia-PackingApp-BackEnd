import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CYCLE_COUNT_STATUS_VALUES } from '../cycle-count.constants';

const trimOrUndefined = ({ value }: { value: unknown }) =>
  value === undefined || value === null || String(value).trim() === '' ? undefined : String(value).trim();

/** GET /cycle-count - same filters as the BOM audit list. */
export class QueryCycleCountDto {
  @ApiPropertyOptional({ description: 'Search by Audit No, audit name, stock file or operator name' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: CYCLE_COUNT_STATUS_VALUES })
  @Transform(({ value }) => trimOrUndefined({ value })?.toUpperCase())
  @IsOptional()
  @IsIn(CYCLE_COUNT_STATUS_VALUES, { message: `status must be one of: ${CYCLE_COUNT_STATUS_VALUES.join(', ')}` })
  status?: string;

  @ApiPropertyOptional({ description: 'Created from (YYYY-MM-DD, IST)', example: '2026-10-01' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fromDate must be in YYYY-MM-DD format' })
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Created to (YYYY-MM-DD, IST, inclusive)', example: '2026-10-31' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'toDate must be in YYYY-MM-DD format' })
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
