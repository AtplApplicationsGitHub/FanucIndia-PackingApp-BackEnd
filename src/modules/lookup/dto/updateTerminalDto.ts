import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTerminalDto {
  @ApiProperty({ example: 'Terminal B', description: 'Updated terminal name' })
  @IsString()
  name: string;
}
