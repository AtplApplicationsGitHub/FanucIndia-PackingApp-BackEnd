import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LabelPrintDto {
  @ApiProperty({
    example: ['SO-1001', 'SO-1002'],
    description: 'Array of Sale Order Numbers to update status for',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  saleOrderNumbers: string[];

  @ApiPropertyOptional({ example: 'CNC Package' })
  @IsOptional()
  @IsString()
  cncText?: string;

  @ApiPropertyOptional({ example: '1/1' })
  @IsOptional()
  @IsString()
  boxNN?: string;
}