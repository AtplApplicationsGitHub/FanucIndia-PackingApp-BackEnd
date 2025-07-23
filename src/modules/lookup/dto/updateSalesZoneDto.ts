import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSalesZoneDto {
  @ApiProperty({ example: 'South Zone', description: 'Updated sales zone name' })
  @IsString()
  name: string;
}
