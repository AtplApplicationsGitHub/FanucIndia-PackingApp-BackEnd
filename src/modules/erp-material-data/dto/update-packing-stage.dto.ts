import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsString } from 'class-validator';

export class UpdatePackingStageDto {
  @ApiProperty({ example: 'ROB-HAND-001' })
  @IsString()
  materialCode!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  packingStage!: number;
}
