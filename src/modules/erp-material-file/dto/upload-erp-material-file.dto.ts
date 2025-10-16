import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadErpMaterialFileDto {
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
    description:
      'A JSON string mapping each original filename to its description.',
    example: '{"photo1.jpg": "Picture of the packed items", "doc1.pdf": "Shipping manifest"}',
  })
  @IsString()
  descriptions: string;
}