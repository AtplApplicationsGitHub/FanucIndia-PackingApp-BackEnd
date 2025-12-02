import { ApiProperty } from '@nestjs/swagger';

export class AdminDispatchSummaryDto {
  @ApiProperty({
    example: 8,
    description: "Count of orders with deliveryDate of today that are not yet dispatched (includes status NULL)",
  })
  ordersToBeDispatched: number;

  @ApiProperty({
    example: 5,
    description: "Count of orders with status 'Stored/Ready for Dispatch' and deliveryDate of today",
  })
  readyForDispatchToday: number;

  @ApiProperty({
    example: 22,
    description: 'Count of orders that were moved to "Dispatched" status today',
  })
  ordersDispatchedToday: number;
}