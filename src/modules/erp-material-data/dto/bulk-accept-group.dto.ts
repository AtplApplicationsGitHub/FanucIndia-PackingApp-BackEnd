import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkAcceptGroupDto {
  @ApiProperty({ example: 'G1', description: 'The group name to accept items for.' })
  @IsString()
  @IsNotEmpty()
  group: string;

  @ApiProperty({ example: 'issue', description: 'The stage to update (issue or packing).' })
  @IsString()
  @IsIn(['issue', 'packing'])
  stageType: 'issue' | 'packing';
}