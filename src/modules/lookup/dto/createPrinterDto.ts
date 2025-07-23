import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePrinterDto {
  @ApiProperty({ example: 'HP LaserJet', description: 'Printer name' })
  @IsString()
  name: string;
}
