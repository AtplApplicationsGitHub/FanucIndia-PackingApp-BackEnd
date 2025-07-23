import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlantCodeDto {
  @ApiProperty({ example: 'IN01', description: 'Plant code' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Bangalore Factory', description: 'Description' })
  @IsString()
  description: string;
}
