import { ApiProperty } from '@nestjs/swagger';

export class AdminPaymentByZoneDto {
  @ApiProperty({ example: 'North Zone' })
  zoneName: string;

  @ApiProperty({ example: 60, description: 'Count of orders with payment cleared' })
  paymentCleared: number;

  @ApiProperty({ example: 15, description: 'Count of orders with payment pending' })
  paymentPending: number;
}