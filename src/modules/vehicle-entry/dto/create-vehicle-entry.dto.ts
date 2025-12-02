import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVehicleEntryDto {
  @ApiProperty({ example: 'Tata Motors', description: 'Name of the customer (from dropdown)' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: 'MH12AB1234', description: 'Vehicle registration number' })
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @ApiProperty({ example: 'VRL Logistics', description: 'Name of the transporter' })
  @IsString()
  @IsNotEmpty()
  transporterName: string;

  @ApiProperty({ example: '9876543210', description: 'Driver contact number' })
  @IsString()
  @IsNotEmpty()
  driverNumber: string;
}