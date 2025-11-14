import { ApiProperty } from '@nestjs/swagger';

export class AdminNewImportDto {
  @ApiProperty({
    example: 'Today (Nov 13)',
    description: 'The label for the day',
  })
  dayLabel: string;

  @ApiProperty({
    example: '2025-11-13',
    description: 'The date in YYYY-MM-DD format',
  })
  date: string;

  @ApiProperty({
    example: 12,
    description: 'The count of distinct SOs imported on this day',
  })
  count: number;
}