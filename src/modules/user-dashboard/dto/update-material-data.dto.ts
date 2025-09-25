import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

export class MaterialDataDto {
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
}

export class UpdateMaterialDataDto {
  @ApiProperty({ type: [MaterialDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDataDto)
  materials: MaterialDataDto[];
}