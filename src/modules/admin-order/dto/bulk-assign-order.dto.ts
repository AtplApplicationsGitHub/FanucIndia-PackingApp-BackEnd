import { IsArray, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkAssignOrderDto {
  @ApiProperty({ description: 'Array of Sales Order IDs to update', type: [Number] })
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  salesOrderIds: number[];

  @ApiProperty({ description: 'ID of the user to assign', type: Number })
  @IsInt()
  @IsNotEmpty()
  assignedUserId: number;
}