import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransporterDto {
  @ApiProperty({ example: 'BlueDart', description: 'Transporter name' })
  @IsString()
  name: string;
}
