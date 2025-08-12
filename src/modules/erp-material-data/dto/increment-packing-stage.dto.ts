import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class IncrementPackingStageDto {
  @ApiProperty({ example: 'ROB-HAND-001' })
  @IsString()
  materialCode!: string;
}
