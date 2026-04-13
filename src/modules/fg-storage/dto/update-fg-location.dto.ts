import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class UpdateFgLocationDto {
  @ApiProperty({
    description: 'The Sales Order ID to update',
    example: 101,
  })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @ApiProperty({
    description: 'The new FG Location to assign to the order',
    example: 'Rack-A1-Top',
  })
  @IsString()
  @IsNotEmpty()
  fgLocation: string;
}