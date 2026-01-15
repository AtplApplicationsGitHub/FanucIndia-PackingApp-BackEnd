import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Fanuc Arm', description: 'Name of the product' })
  @IsString()
  name: string;
}
