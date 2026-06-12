import { ApiProperty } from '@nestjs/swagger';

export class AdminBinCountDto {
  @ApiProperty({ description: 'Number of orders with exactly 1 bin', example: 5 })
  oneBinCount: number;

  @ApiProperty({ description: 'Number of orders with 2 or 3 bins', example: 8 })
  twoToThreeBinCount: number;

  @ApiProperty({ description: 'Number of orders with 4 or more bins', example: 3 })
  fourPlusBinCount: number;
}