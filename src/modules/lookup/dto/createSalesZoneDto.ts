import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSalesZoneDto {
  @ApiProperty({ example: 'North Zone', description: 'Sales zone name' })
  @IsString()
  name: string;
}
