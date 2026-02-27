import { IsArray, IsBoolean, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkSkipIssueDto {
  @ApiProperty({ description: 'Array of Sales Order IDs', example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  salesOrderIds: number[];

  @ApiProperty({ description: 'Value to set for skipIssueStage', example: true })
  @IsBoolean()
  @IsNotEmpty()
  skipIssueStage: boolean;
}