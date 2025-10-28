import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumberString, ValidateIf } from 'class-validator';

export class UpdateMobileDispatchDto {
  @ApiPropertyOptional({ description: 'The ID of the existing customer.', example: 1 })
  @IsOptional()
  @IsNumberString()
  @ValidateIf(o => !o.customerName)
  customerId?: number;

  @ApiPropertyOptional({ description: 'The name of the new or existing customer.', example: 'Updated Customer Name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => !o.customerId)
  customerName?: string;

  @ApiProperty({ description: 'The updated dispatch address.', example: '456 New St, Anytown' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'The ID of the existing transporter.', example: 2 })
  @IsOptional()
  @IsNumberString()
  @ValidateIf(o => !o.transporterName)
  transporterId?: number;

  @ApiPropertyOptional({ description: 'The name of the new or existing transporter.', example: 'Updated Logistics' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => !o.transporterId)
  transporterName?: string;

  @ApiProperty({ description: 'The updated vehicle registration number.', example: 'KA01XY9876' })
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;
}