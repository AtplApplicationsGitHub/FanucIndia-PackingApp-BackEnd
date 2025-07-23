import {
  IsInt, IsString, IsBoolean, IsDateString, IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalesCrudDto {
  @ApiProperty({ example: 1, description: 'Product ID (lookup)' })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 'SO12345', description: 'Sale Order Number' })
  @IsString()
  saleOrderNumber: string;

  @ApiProperty({ example: 'OUT123', description: 'Outbound Delivery' })
  @IsString()
  outboundDelivery: string;

  @ApiProperty({ example: 'TRF456', description: 'Transfer Order' })
  @IsString()
  transferOrder: string;

  @ApiProperty({ example: '2025-07-02', description: 'Delivery Date (YYYY-MM-DD)' })
  @IsDateString()
  deliveryDate: string;

  @ApiProperty({ example: 1, description: 'Transporter ID (lookup)' })
  @IsInt()
  transporterId: number;

  @ApiProperty({ example: 1, description: 'Plant Code ID (lookup)' })
  @IsInt()
  plantCodeId: number;

  @ApiProperty({ example: true, description: 'Payment Clearance (true/false)' })
  @IsBoolean()
  paymentClearance: boolean;

  @ApiProperty({ example: 1, description: 'Sales Zone ID (lookup)' })
  @IsInt()
  salesZoneId: number;

  @ApiProperty({ example: 1, description: 'Packing Config ID (lookup)' })
  @IsInt()
  packConfigId: number;

  @ApiProperty({ example: 1, description: 'Customer ID (lookup)' })
  @IsInt()
  customerId: number;

  @ApiPropertyOptional({ example: 'Handle with care', description: 'Special Remarks (optional)' })
  @IsString()
  @IsOptional()
  specialRemarks?: string;
}
