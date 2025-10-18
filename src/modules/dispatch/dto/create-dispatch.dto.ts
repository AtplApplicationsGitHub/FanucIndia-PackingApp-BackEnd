import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsArray, ValidateIf, IsDefined } from 'class-validator';

export class CreateDispatchDto {
  @ApiPropertyOptional({ description: 'The ID of the existing customer.', example: '1' })
  @IsOptional()
  @IsNumberString()
  @ValidateIf(o => !o.customerName)
  @IsDefined({ message: 'Either customerId or customerName must be provided.' })
  customerId?: string; 

  @ApiPropertyOptional({ description: 'The name of the new or existing customer.', example: 'New Customer Inc.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => !o.customerId) 
  @IsDefined({ message: 'Either customerId or customerName must be provided.' })
  customerName?: string;

  @ApiProperty({ description: 'The dispatch address.', example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  address: string; 

  @ApiPropertyOptional({ description: 'Transporter ID (optional)'})
  @IsOptional()
  @IsNumberString()
  transporterId?: string;

  @ApiProperty({ description: 'Vehicle registration number.'})
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @ApiPropertyOptional({ type: [String], description: 'List of Sale Order Numbers to be dispatched (optional)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  saleOrderNumbers?: string[];
}