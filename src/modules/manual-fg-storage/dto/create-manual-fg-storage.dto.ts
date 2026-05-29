import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateManualFgStorageDto {
  @ApiProperty({
    description: 'Sales order number',
    example: 'SO12345',
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  salesOrderNumber: string;

  @ApiProperty({
    description: 'FG location',
    example: 'Rack-A1-Top',
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  fgLocation: string;

  @ApiProperty({
    description: 'User who manually stored the FG location',
    example: 'Kishore',
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiPropertyOptional({
    description:
      'UTC storage date/time for this sales order. If omitted, backend current UTC date/time is used.',
    example: '2026-05-28T10:30:00.000Z',
  })
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : String(value).trim(),
  )
  @IsOptional()
  @IsDateString()
  dateTime?: string;
}
