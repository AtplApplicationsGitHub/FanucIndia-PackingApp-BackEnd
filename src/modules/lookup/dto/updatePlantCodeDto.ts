import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlantCodeDto {
  @ApiProperty({ example: 'IN02', description: 'Updated plant code' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Chennai Factory', description: 'Updated description' })
  @IsString()
  description: string;
}
