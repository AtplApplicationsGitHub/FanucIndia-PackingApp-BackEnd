import {
  IsInt,
  IsString,
  IsBoolean,
  IsDateString,
  IsOptional,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalesCrudDto {
  @ApiProperty({ example: 1, description: 'Product ID (lookup)' })
  @IsInt({ message: 'Product ID must be an integer.' })
  productId: number;

  @ApiProperty({ example: 'SO12345', description: 'Sale Order Number' })
  @IsString({ message: 'Sale Order Number must be a string.' })
  @MinLength(10, { message: 'Sale Order Number must be at least 10 characters long.' })
  saleOrderNumber: string;

  @ApiProperty({ example: 'OUT123', description: 'Outbound Delivery' })
  @IsString({ message: 'Outbound Delivery must be a string.' })
  outboundDelivery: string;

  @ApiProperty({ example: 'TRF456', description: 'Transfer Order' })
  @IsString({ message: 'Transfer Order must be a string.' })
  transferOrder: string;

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

  @ApiProperty({ example: 1, description: 'Plant Code ID (lookup)' })
  @IsInt({ message: 'Plant Code ID must be an integer.' })
  plantCodeId: number;

  @ApiProperty({ example: true, description: 'Payment Clearance (true/false)' })
  @IsBoolean({ message: 'Payment Clearance must be a boolean.' })
  paymentClearance: boolean;

  @ApiProperty({ example: 1, description: 'Sales Zone ID (lookup)' })
  @IsInt({ message: 'Sales Zone ID must be an integer.' })
  salesZoneId: number;

  @ApiProperty({ example: 1, description: 'Packing Config ID (lookup)' })
  @IsInt({ message: 'Packing Config ID must be an integer.' })
  packConfigId: number;

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
