import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Fanuc Arm', description: 'Name of the product' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'F-ARM-001', description: 'Unique code for the product' })
  @IsString()
  code: string;
}
