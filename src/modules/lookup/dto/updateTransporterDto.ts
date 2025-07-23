import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTransporterDto {
  @ApiProperty({ example: 'DHL', description: 'Updated transporter name' })
  @IsString()
  name: string;
}
