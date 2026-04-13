import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'The Sale Order Number',
    example: 'SO12345',
  })
  @IsOptional()
  @IsString()
  saleOrderNumber?: string;

  @ApiPropertyOptional({
    description: 'The Outbound Delivery Number',
    example: 'OBD-A',
  })
  @IsOptional()
  @IsString()
  outboundDelivery?: string;
}