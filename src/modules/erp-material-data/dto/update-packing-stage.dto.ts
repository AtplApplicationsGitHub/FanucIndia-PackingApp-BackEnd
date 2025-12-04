import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdatePackingStageDto {
  @ApiProperty({ example: 'ROB-HAND-001' })
  @IsString()
  materialCode!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  packingStage!: number;

  @ApiPropertyOptional({ example: 101, description: 'The unique ID of the material row.' })
  @IsOptional()
  @IsNumber()
  materialId?: number;
}