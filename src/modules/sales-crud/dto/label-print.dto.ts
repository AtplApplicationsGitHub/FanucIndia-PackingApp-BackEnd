import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class LabelPrintDto {
  @ApiProperty({
    example: ['SO-1001', 'SO-1002'],
    description: 'Array of Sale Order Numbers to update status for',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  id: number[];

  @ApiPropertyOptional({ example: 'CNC Package' })
  @IsOptional()
  @IsString()
  cncText?: string;

  @ApiPropertyOptional({ example: '1/1' })
  @IsOptional()
  @IsString()
  boxNN?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;
}