import { ApiProperty } from '@nestjs/swagger';

export class AdminFgLocationOrderDto {
  @ApiProperty({
    example: '4500012345',
    description: 'Sales order number',
  })
  saleOrderNumber: string;

  @ApiProperty({
    example: '8000012345',
    description: 'Outbound delivery number',
  })
  outboundDelivery: string;

  @ApiProperty({
    example: { bin: 'FG-01', rack: 'A1' },
    description: 'FG location value from SalesOrder.fgLocation',
  })
  location: unknown;
}

export class AdminDispatchSummaryDto {
  @ApiProperty({
    example: 8,
    description:
      'Count of orders with selected deliveryDate that are not yet dispatched, including status NULL',
  })
  ordersToBeDispatched: number;

  @ApiProperty({
    example: 3,
    description:
      'Count of To Dispatch orders where payment clearance is Yes for the selected delivery date',
  })
  ordersToBeDispatchedPaymentCleared: number;

  @ApiProperty({
    example: 5,
    description:
      "Count of orders with status 'Stored/Ready for Dispatch' and selected deliveryDate",
  })
  readyForDispatchToday: number;

  @ApiProperty({
    example: 22,
    description:
      'Count of orders that are dispatched for the selected deliveryDate',
  })
  ordersDispatchedToday: number;

  @ApiProperty({
    example: 12,
    description:
      'Count of SalesOrder records with fgLocation not null for the selected deliveryDate',
  })
  fgLocationCount: number;

  @ApiProperty({
    type: [AdminFgLocationOrderDto],
    description:
      'Sales order, outbound delivery and FG location details used for FG popup',
  })
  fgLocationOrders: AdminFgLocationOrderDto[];
}
