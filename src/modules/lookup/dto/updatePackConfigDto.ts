import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePackConfigDto {
  @ApiProperty({ example: 'Box Type B', description: 'Updated packing config name' })
  @IsString()
  configName: string;
}
