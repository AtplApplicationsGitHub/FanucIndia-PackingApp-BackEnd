import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

const MAX_POSTGRES_INT = 2147483647;

export class IbdPrintUploadIdDto {
  @ApiProperty({ minimum: 1, maximum: MAX_POSTGRES_INT })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INT)
  id!: number;
}

export class IbdPrintQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000000)
  page = 1;

  @ApiPropertyOptional({ default: 10, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class IbdPrintSelectionDto {
  @ApiPropertyOptional({
    type: [Number],
    description: 'Row IDs from this upload. Omit or send an empty array to include every row.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_POSTGRES_INT, { each: true })
  rowIds?: number[];
}
