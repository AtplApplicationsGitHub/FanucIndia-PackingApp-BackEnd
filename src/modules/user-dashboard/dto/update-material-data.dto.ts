import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class MaterialDataDto {
  @ApiPropertyOptional({ description: 'Unique ID of the material row (BigInt)', example: '101' })
  @IsOptional()
  ID?: string | number;
  
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  Material_Code: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  Issue_stage: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  Packing_stage: number;

  @ApiPropertyOptional({
    description: 'The ISO 8601 timestamp of when the update was made offline',
    example: '2025-10-30T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  UpdatedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  Accept_Bulk_Data?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Classification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Mapping_Barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  Remarks_Required?: boolean;
}

export class UpdateMaterialDataDto {
  @ApiProperty({ type: [MaterialDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDataDto)
  materials: MaterialDataDto[];
}