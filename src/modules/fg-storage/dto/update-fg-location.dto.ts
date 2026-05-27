import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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

  @ApiPropertyOptional({
    description: 'Existing transporter ID to update on the sales order',
    example: 2,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : Number(value),
  )
  @IsNumber()
  transporterId?: number;

  @ApiPropertyOptional({
    description: 'Transporter name to update on the sales order',
    example: 'VRL Logistics',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  transporterName?: string;
}
