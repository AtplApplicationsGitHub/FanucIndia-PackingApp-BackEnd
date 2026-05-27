import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumberString, ValidateIf, IsDefined, IsInt, Min } from 'class-validator';

export class CreateMobileDispatchDto {
  @ApiPropertyOptional({ description: 'Vehicle Entry ID to create dispatch for a selected vehicle entry.', example: 12 })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  vehicleEntryId?: number;

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
