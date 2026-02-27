import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Tata Motors', description: 'Customer name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Pune, India', description: 'Customer address' })
  @IsString()
  address: string;

  @ApiProperty({ example: '9876543210', description: 'Customer contact number'})
  @IsOptional()
  @IsString()
  contactNumber?: string;
}
