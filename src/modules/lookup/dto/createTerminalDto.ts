import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTerminalDto {
  @ApiProperty({ example: 'Terminal A', description: 'Terminal name' })
  @IsString()
  name: string;
}
