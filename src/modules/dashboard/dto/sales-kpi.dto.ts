import { ApiProperty } from '@nestjs/swagger';

export class SalesKpiDto {
  @ApiProperty({ example: 10, description: 'Total SOs created by the user' })
  totalSoCount: number;

  @ApiProperty({ example: 5, description: 'Total SOs created by the user that are Dispatched' })
  dispatchedSoCount: number;

  @ApiProperty({ example: 5, description: 'Count of orders with status NULL (To be Issued)' })
  toBeIssuedCount: number;

  @ApiProperty({ example: 3, description: 'Count of orders with status R105 (Assigned)' })
  r105Count: number;

  @ApiProperty({ example: 2, description: 'Count of orders with status W105 (Issued)' })
  w105Count: number;

  @ApiProperty({ example: 1, description: 'Count of orders with status F105 (Packed)' })
  f105Count: number;
}