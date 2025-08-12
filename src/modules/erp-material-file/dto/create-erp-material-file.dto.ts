import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateErpMaterialFileDto {
  @ApiPropertyOptional({
    description: 'Sales order number this file belongs to (nullable in DB)',
    maxLength: 500,
    example: 'SO-2025-000123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  saleOrderNumber?: string | null;

  @ApiProperty({
    description: 'Stored file name (unique with saleOrderNumber)',
    maxLength: 500,
    example: 'packing_list_SO-2025-000123.pdf',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fileName!: string;

  @ApiPropertyOptional({
    description: 'Optional description/notes',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
