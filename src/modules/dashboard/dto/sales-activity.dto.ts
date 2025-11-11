import { ApiProperty } from '@nestjs/swagger';

export class SalesActivityDto {
  @ApiProperty({ example: 'SO-12345' })
  salesOrderNumber: string;

  @ApiProperty({ example: 'Dispatched' })
  status: string;

  @ApiProperty({ example: '2025-11-10T14:30:00.000Z' })
  activityTimestamp: Date;
}