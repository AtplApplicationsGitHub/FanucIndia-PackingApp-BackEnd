import { ApiProperty } from '@nestjs/swagger';

export class AdminStatusByZoneDto {
  @ApiProperty({ example: 'North Zone' })
  zoneName: string;

  @ApiProperty({ example: 40 })
  r105Count: number;

  @ApiProperty({ example: 20 })
  w105Count: number;

  @ApiProperty({ example: 15 })
  f105Count: number;

  @ApiProperty({ example: 5 })
  toBeIssuedCount: number;

  @ApiProperty({ example: 210 })
  dispatchedCount: number;
}