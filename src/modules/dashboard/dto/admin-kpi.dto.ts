import { ApiProperty } from '@nestjs/swagger';

export class AdminKpiDto {
  @ApiProperty({ example: 1248, description: 'Total SOs in the system' })
  totalSoCount: number;

  @ApiProperty({
    example: 12.5,
    description: 'Percentage change of new SOs this month vs. last month',
  })
  totalSoCountPercentageChange: number;

  @ApiProperty({
    example: 526,
    description: 'Total orders currently overdue',
  })
  overdueSoCount: number;

  @ApiProperty({
    example: 15.2,
    description: 'Percentage change of overdue orders now vs. start of the month',
  })
  overdueSoCountPercentageChange: number;

  @ApiProperty({ example: 756, description: 'Total orders ever dispatched' })
  dispatchedSoCount: number;

  @ApiProperty({
    example: 5.7,
    description: 'Percentage change of orders dispatched this month vs. last month',
  })
  dispatchedSoCountPercentageChange: number;
}