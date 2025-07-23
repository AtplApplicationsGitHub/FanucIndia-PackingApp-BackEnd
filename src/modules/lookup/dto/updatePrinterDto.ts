import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePrinterDto {
  @ApiProperty({ example: 'Epson TX100', description: 'Updated printer name' })
  @IsString()
  name: string;
}
