import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePackConfigDto {
  @ApiProperty({ example: 'Box Type A', description: 'Packing config name' })
  @IsString()
  configName: string;
}
