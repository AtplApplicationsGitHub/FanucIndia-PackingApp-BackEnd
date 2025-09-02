import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumberString } from 'class-validator';

export class CreateDispatchDto {
  @ApiProperty()
  @IsNumberString()
  customerId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  transporterId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;
}
