import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiProperty({ example: 'Mahindra', description: 'Updated customer name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Chennai, India', description: 'Updated address' })
  @IsString()
  address: string;

  @ApiProperty({ example: '9123456780', description: 'Updated contact number'})
  @IsOptional()
  @IsString()
  contactNumber?: string;
}
