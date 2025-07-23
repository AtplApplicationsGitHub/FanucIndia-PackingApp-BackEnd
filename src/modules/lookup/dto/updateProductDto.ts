import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ example: 'Updated Fanuc Arm', description: 'Updated name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'F-ARM-002', description: 'Updated code' })
  @IsString()
  code: string;
}
