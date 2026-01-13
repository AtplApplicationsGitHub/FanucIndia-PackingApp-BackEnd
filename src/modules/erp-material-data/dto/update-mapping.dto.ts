import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMappingDto {
  @ApiProperty({ description: 'Mapping Barcode value', required: false })
  @IsString()
  @IsOptional()
  mappingBarcode?: string;

  @ApiProperty({ description: 'Group value', required: false })
  @IsString()
  @IsOptional()
  group?: string;
  
  @ApiProperty({ description: 'Material ID (PK of ERP_Material_Data)', required: true })
  @IsNumber()
  materialId: number;
}