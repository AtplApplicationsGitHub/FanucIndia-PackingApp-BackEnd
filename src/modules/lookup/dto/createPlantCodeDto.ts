import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlantCodeDto {
  @ApiProperty({ example: 'IN01', description: 'Plant code' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Bangalore Factory', description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
