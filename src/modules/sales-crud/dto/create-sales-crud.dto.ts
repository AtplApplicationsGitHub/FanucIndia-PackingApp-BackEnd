import {
  IsInt,
  IsString,
  IsBoolean,
  IsDateString,
  IsOptional,
  MinLength,
  ValidateIf,
  IsNumberString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalesCrudDto {
  @ApiPropertyOptional({ example: 1, description: 'Product ID (lookup)' })
  @IsOptional()
  @IsInt({ message: 'Product ID must be an integer.' })
  productId?: number;

  @ApiProperty({ example: 'SO12345', description: 'Sale Order Number' })
  @IsString({ message: 'Sale Order Number must be a string.' })
  @MinLength(10, { message: 'Sale Order Number must be at least 10 characters long.' })
  saleOrderNumber: string;

  @ApiProperty({ example: '123456', description: 'Outbound Delivery (numbers only)' })
  @IsString({ message: 'Outbound Delivery must be a string.' })
  @IsNumberString({}, { message: 'Outbound Delivery must contain only numbers.' })
  outboundDelivery: string;

  @ApiPropertyOptional({ example: 'TRF456', description: 'Transfer Order' })
  @IsOptional()
  @IsString({ message: 'Transfer Order must be a string.' })
  transferOrder?: string;

  @ApiProperty({
    example: '2025-07-02',
    description: 'Delivery Date (YYYY-MM-DD)',
  })
  @IsDateString(
    {},
    { message: 'Delivery Date must be a valid ISO date string (YYYY-MM-DD).' },
  )
  deliveryDate: string;

  @ApiProperty({ example: 1, description: 'Transporter ID (lookup)' })
  @IsInt({ message: 'Transporter ID must be an integer.' })
  transporterId: number;

  @ApiPropertyOptional({ example: 'P123', description: 'Plant Code (text)' })
  @IsOptional()
  @IsString({ message: 'Plant Code must be a string.' })
  plantCode?: string;

  @ApiProperty({ example: true, description: 'Payment Clearance (true/false)' })
  @IsBoolean({ message: 'Payment Clearance must be a boolean.' })
  paymentClearance: boolean;

  @ApiProperty({ example: 1, description: 'Sales Zone ID (lookup)' })
  @IsInt({ message: 'Sales Zone ID must be an integer.' })
  salesZoneId: number;

  @ApiPropertyOptional({ example: 1, description: 'Packing Config ID (lookup)' })
  @IsOptional()
  @IsInt({ message: 'Packing Config ID must be an integer.' })
  packConfigId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Customer ID (lookup). Provide either customerId OR customerName.',
  })
  @ValidateIf((o) => !o.customerName)
  @IsInt({ message: 'Customer ID must be an integer.' })
  @IsOptional()
  customerId?: number;

  @ApiPropertyOptional({
    example: 'LMW Limited',
    description: 'Customer Name (free text). Provide either customerId OR customerName.',
  })
  @ValidateIf((o) => !o.customerId)
  @IsString({ message: 'Customer Name must be a string.' })
  @IsOptional()
  customerName?: string;
  @ApiPropertyOptional({
    example: 'Handle with care',
    description: 'Special Remarks (optional)',
  })
  @IsString({ message: 'Special Remarks must be a string.' })
  @IsOptional()
  specialRemarks?: string;

  @ApiPropertyOptional({
    example: 'Gate entry required',
    description: 'Additional Remarks (optional)',
  })
  @IsString({ message: 'Additional Remarks must be a string.' })
  @IsOptional()
  additionalRemarks?: string;

  @ApiPropertyOptional({ 
    example: 'Fragile content', 
    description: 'Label Remarks (optional)', 
  }) 
  @IsString({ message: 'Label Remarks must be a string.' }) 
  @IsOptional() 
  labelRemarks?: string;
}