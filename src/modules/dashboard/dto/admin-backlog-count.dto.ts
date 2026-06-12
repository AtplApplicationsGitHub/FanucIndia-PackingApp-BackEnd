import { ApiProperty } from '@nestjs/swagger';

export class AdminBacklogOrderDto {
  @ApiProperty({ example: '10000000020' })
  saleOrderNumber: string;

  @ApiProperty({ example: '123456799' })
  outboundDelivery: string;
}

export class AdminBacklogItemDto {
  @ApiProperty({ description: 'Delivery date in YYYY-MM-DD format', example: '2026-06-11' })
  date: string;

  @ApiProperty({ description: 'Day label', example: 'Yesterday (Jun 11)' })
  dayLabel: string;

  @ApiProperty({ description: 'Count of undispatched SOs for this delivery date', example: 3 })
  count: number;

  @ApiProperty({ type: [AdminBacklogOrderDto], description: 'List of undispatched SOs for this date' })
  orders: AdminBacklogOrderDto[];
}

export class AdminBacklogCountDto {
  @ApiProperty({ description: 'Total undispatched SOs across all 5 days', example: 14 })
  totalBacklog: number;

  @ApiProperty({ type: [AdminBacklogItemDto], description: 'Per-day breakdown for last 5 days before selected date' })
  breakdown: AdminBacklogItemDto[];
}