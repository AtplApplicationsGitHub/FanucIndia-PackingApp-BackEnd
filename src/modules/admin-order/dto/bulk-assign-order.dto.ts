import { IsArray, IsInt, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkAssignOrderDto {
  @ApiProperty({ description: 'Array of Sales Order IDs to update', type: [Number] })
  @IsArray()
  @IsNotEmpty()
  @IsInt({ each: true })
  salesOrderIds: number[];

  @ApiPropertyOptional({ description: 'ID of the user to assign', type: Number })
  @IsOptional()
  @IsInt()
  assignedUserId?: number | null;

  @ApiPropertyOptional({ description: 'ID of the user to assign for Issue stage', type: Number })
  @IsOptional()
  @IsInt()
  issueAssignedUserId?: number | null;

  @ApiPropertyOptional({ description: 'ID of the user to assign for Packing stage', type: Number })
  @IsOptional()
  @IsInt()
  packingAssignedUserId?: number | null;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  skipIssueStage?: boolean | null;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  skipPackingStage?: boolean | null;

  @ApiPropertyOptional({ type: Number, description: 'Priority value to set during assignment' })
  @IsOptional()
  @IsInt()
  priority?: number | null;
}