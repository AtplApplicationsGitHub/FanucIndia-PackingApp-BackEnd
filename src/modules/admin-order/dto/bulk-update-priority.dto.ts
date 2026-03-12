import { IsArray, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkUpdatePriorityDto {
  @ApiProperty({ type: [Number], description: 'List of Sales Order IDs' })
  @IsArray()
  salesOrderIds: number[];

  @ApiPropertyOptional({ type: Number, description: 'Priority value or null to clear' })
  @IsOptional()
  @IsInt()
  priority?: number | null;
}