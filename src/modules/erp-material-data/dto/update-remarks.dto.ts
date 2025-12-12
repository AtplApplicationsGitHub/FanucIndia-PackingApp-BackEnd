import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRemarksDto {
  @ApiProperty({ description: 'Remarks content', example: 'Damaged box' })
  @IsOptional()
  @IsString()
  remarks?: string;
}