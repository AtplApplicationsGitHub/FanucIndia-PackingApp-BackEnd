import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { AUDIT_STATUS_VALUES, AUDIT_TYPE, AUDIT_TYPE_VALUES } from '../shared/audit.constants';

const trimOrUndefined = ({ value }: { value: unknown }) =>
  value === undefined || value === null || String(value).trim() === ''
    ? undefined
    : String(value).trim();

export class QueryAuditListDto {
  @ApiPropertyOptional({
    description: 'Audit type of the clicked card (default CYCLE_COUNT)',
    enum: AUDIT_TYPE_VALUES,
    default: AUDIT_TYPE.CYCLE_COUNT,
  })
  @Transform(({ value }) => trimOrUndefined({ value })?.toUpperCase())
  @IsOptional()
  @IsIn(AUDIT_TYPE_VALUES, {
    message: `auditType must be one of: ${AUDIT_TYPE_VALUES.join(', ')}`,
  })
  auditType?: string = AUDIT_TYPE.CYCLE_COUNT;

  @ApiPropertyOptional({
    description: 'Search by Audit No, audit name, file name, operator name or storage bin',
  })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by audit status', enum: AUDIT_STATUS_VALUES })
  @Transform(({ value }) => trimOrUndefined({ value })?.toUpperCase())
  @IsOptional()
  @IsIn(AUDIT_STATUS_VALUES, {
    message: `status must be one of: ${AUDIT_STATUS_VALUES.join(', ')}`,
  })
  status?: string;

  @ApiPropertyOptional({ description: 'Created date from (YYYY-MM-DD, IST)', example: '2026-10-01' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fromDate must be in YYYY-MM-DD format' })
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Created date to (YYYY-MM-DD, IST, inclusive)', example: '2026-10-31' })
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
