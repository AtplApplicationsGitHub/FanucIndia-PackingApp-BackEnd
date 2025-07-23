import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminOrderDto {
  @ApiPropertyOptional({ example: 'R105', description: 'Order status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1, description: 'Priority value' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ example: 1, description: 'Terminal ID' })
  @IsOptional()
  @IsInt()
  terminalId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Customer ID (lookup)' })
  @IsInt()
  @IsOptional()
  customerId?: number;

  @ApiPropertyOptional({ example: 'SO123456', description: 'Sale Order Number' })
  @IsOptional()
  @IsString()
  saleOrderNumber?: string;

  @ApiPropertyOptional({ example: 'OB7890', description: 'Outbound Delivery' })
  @IsOptional()
  @IsString()
  outboundDelivery?: string;

  @ApiPropertyOptional({ example: 'TR999', description: 'Transfer Order' })
  @IsOptional()
  @IsString()
  transferOrder?: string;

  @ApiPropertyOptional({ example: '2025-07-18', description: 'Delivery Date (ISO)' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ example: 'Delivery is urgent', description: 'Special Remarks' })
  @IsOptional()
  @IsString()
  specialRemarks?: string;

  @ApiPropertyOptional({ example: 1, description: 'Product ID' })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({ example: 2, description: 'Transporter ID' })
  @IsOptional()
  @IsInt()
  transporterId?: number;

  @ApiPropertyOptional({ example: 3, description: 'Plant Code ID' })
  @IsOptional()
  @IsInt()
  plantCodeId?: number;

  @ApiPropertyOptional({ example: true, description: 'Payment Clearance' })
  @IsOptional()
  @IsBoolean()
  paymentClearance?: boolean;

  @ApiPropertyOptional({ example: 4, description: 'Sales Zone ID' })
  @IsOptional()
  @IsInt()
  salesZoneId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Pack Config ID' })
  @IsOptional()
  @IsInt()
  packConfigId?: number;
}
