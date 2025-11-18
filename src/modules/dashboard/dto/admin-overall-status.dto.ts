import { ApiProperty } from '@nestjs/swagger';

export class AdminOverallStatusDto {
  @ApiProperty({
    example: 1200,
    description: "Total count of all sales orders in the system",
  })
  totalOrders: number;

  @ApiProperty({
    example: 150,
    description: "Total count of orders with status 'R105' (Imported/Assigned)",
  })
  r105Count: number;

  @ApiProperty({
    example: 85,
    description: "Total count of orders with status 'W105' (Issued)",
  })
  w105Count: number;

  @ApiProperty({
    example: 62,
    description: "Total count of orders with status 'F105' (Packed/Awaiting Dispatch)",
  })
  f105Count: number;

  @ApiProperty({
    example: 850,
    description: "Total count of orders with status 'Dispatched'",
  })
  dispatchedCount: number;
}