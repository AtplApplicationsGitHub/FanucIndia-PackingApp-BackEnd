import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaterialBarcodeDto {
  @ApiProperty({ description: 'ERP Code', example: 'MAT-001' })
  @IsString()
  @IsNotEmpty()
  erpCode: string;

  @ApiPropertyOptional({ description: 'Mapping Barcode', example: 'BAR-001' })
  @IsOptional()
  @IsString()
  mappingBarcode?: string;

  @ApiPropertyOptional({ description: 'Group', example: 'Group A' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ description: 'Accept Bulk Data', default: false })
  @IsOptional()
  @IsBoolean()
  acceptBulkData?: boolean;

  @ApiPropertyOptional({ description: 'Remarks Required', default: false })
  @IsOptional()
  @IsBoolean()
  remarksRequired?: boolean;

  @ApiPropertyOptional({ description: 'Classification', example: 'Class A' })
  @IsOptional()
  @IsString()
  classification?: string;
}