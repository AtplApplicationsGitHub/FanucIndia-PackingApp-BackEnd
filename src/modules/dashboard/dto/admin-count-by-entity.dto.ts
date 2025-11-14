import { ApiProperty } from '@nestjs/swagger';

export class AdminCountByEntityDto {
  @ApiProperty({ example: 'Fanuc Arm' })
  name: string;

  @ApiProperty({ example: 215 })
  count: number;
}