import { ApiProperty } from '@nestjs/swagger';

export class SalesPaymentClearanceDto {
  @ApiProperty({
    example: 'North Zone',
    description: "The name of the sales zone",
  })
  zoneName: string;

  @ApiProperty({
    example: 60,
    description: 'Count of non-dispatched orders with payment cleared',
  })
  paymentCleared: number;

  @ApiProperty({
    example: 15,
    description: 'Count of non-dispatched orders with payment pending',
  })
  paymentPending: number;
}