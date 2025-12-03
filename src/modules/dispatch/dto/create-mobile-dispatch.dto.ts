import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumberString, ValidateIf, IsDefined } from 'class-validator';

export class CreateMobileDispatchDto {
  @ApiPropertyOptional({ description: 'The ID of the existing transporter.', example: '2' })
  @IsOptional()
  @IsNumberString()
  @ValidateIf(o => !o.transporterName) 
  @IsDefined({ message: 'Either transporterId or transporterName must be provided.' }) 
  transporterId?: number;

  @ApiPropertyOptional({ description: 'The name of the new or existing transporter.', example: 'VRL Logistics' })
  @IsOptional() 
  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => !o.transporterId) 
  @IsDefined({ message: 'Either transporterId or transporterName must be provided.' }) 
  transporterName?: string;

  @ApiProperty({ description: 'The vehicle registration number.', example: 'MH12AB1234' })
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;
}