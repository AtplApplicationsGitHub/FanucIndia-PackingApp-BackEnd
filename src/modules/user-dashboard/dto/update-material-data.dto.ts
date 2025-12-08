import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested, IsOptional, IsDateString } from 'class-validator';

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
}

export class UpdateMaterialDataDto {
  @ApiProperty({ type: [MaterialDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDataDto)
  materials: MaterialDataDto[];
}