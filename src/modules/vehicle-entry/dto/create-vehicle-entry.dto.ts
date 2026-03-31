import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';

const Time12HourRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] [APap][mM]$/;

export class CreateVehicleEntryDto {
  @ApiPropertyOptional({ example: 'Tata Motors', description: 'Name of the customer (from dropdown)' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ example: 'MH12AB1234', description: 'Vehicle registration number' })
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @ApiProperty({ example: 'VRL Logistics', description: 'Name of the transporter' })
  @IsString()
  @IsNotEmpty()
  transporterName: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Driver contact number' })
  @IsString()
  @IsOptional()
  driverNumber?: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Name of the driver' })
  @IsString()
  @IsOptional()
  driverName?: string;

  @ApiPropertyOptional({ example: '10:30 AM', description: 'Vehicle entry time in 12hr format' })
  @IsString()
  @IsOptional()
  @Matches(Time12HourRegex, { message: 'inTime must be a valid 12-hour format time (e.g., 10:30 AM)' })
  inTime?: string;

  @ApiPropertyOptional({ example: '05:45 PM', description: 'Vehicle exit time in 12hr format' })
  @IsString()
  @IsOptional()
  @Matches(Time12HourRegex, { message: 'outTime must be a valid 12-hour format time (e.g., 05:45 PM)' })
  outTime?: string;
}