import { ApiProperty } from '@nestjs/swagger';

export class AdminStatusByCustomerDto {
  @ApiProperty({ example: 'Acme Corp' })
  customerName: string;

  @ApiProperty({ example: 12 })
  toBeIssuedCount: number;

  @ApiProperty({ example: 5 })
  r105Count: number;

  @ApiProperty({ example: 3 })
  w105Count: number;

  @ApiProperty({ example: 2 })
  f105Count: number;

  @ApiProperty({ example: 25 })
  dispatchedCount: number;
}

export class AdminPaymentByCustomerDto {
  @ApiProperty({ example: 'Acme Corp' })
  customerName: string;

  @ApiProperty({ example: 45 })
  paymentCleared: number;

  @ApiProperty({ example: 10 })
  paymentPending: number;
}