import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkAssignOrderDto {
  @ApiProperty({
    description: 'Array of Sales Order IDs to update',
    type: [Number],
  })
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  salesOrderIds: number[];

  @ApiPropertyOptional({
    description: 'ID of the user to assign',
    type: Number,
  })
  @IsOptional()
  @IsInt()
  assignedUserId?: number | null;

  @ApiPropertyOptional({
    description: 'ID of the user to assign for Issue stage',
    type: Number,
  })
  @IsOptional()
  @IsInt()
  issueUserId?: number | null;

  @ApiPropertyOptional({
    description: 'ID of the user to assign for Packing stage',
    type: Number,
  })
  @IsOptional()
  @IsInt()
  packingUserId?: number | null;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  skipIssueStage?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  skipPackingStage?: boolean;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  priority?: number | null;

  @ApiPropertyOptional({ description: 'Bulk delivery date update' })
  @IsOptional()
  deliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Bulk payment status update (Yes/No)',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  paymentClearance?: boolean;
}
