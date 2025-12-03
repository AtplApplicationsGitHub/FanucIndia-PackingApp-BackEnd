import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsArray } from 'class-validator';

export class CreateDispatchDto {

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