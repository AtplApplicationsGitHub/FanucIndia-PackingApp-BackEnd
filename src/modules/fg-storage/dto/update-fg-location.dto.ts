import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateFgLocationDto {
  @ApiProperty({
    description: 'The Sales Order number to update',
    example: 'SO12345',
  })
  @IsString()
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