import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';
import { ReviewReconciliationDto } from './review-reconciliation.dto';

export const BULK_REVIEW_MAX_ITEMS = 500;

export class BulkReviewReconciliationDto extends ReviewReconciliationDto {
  @ApiProperty({
    type: [Number],
    example: [101, 102, 103],
    description: `Discrepancy (variance) ids to review together. Max ${BULK_REVIEW_MAX_ITEMS}.`,
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Select at least one discrepancy.' })
  @ArrayMaxSize(BULK_REVIEW_MAX_ITEMS, {
    message: `A maximum of ${BULK_REVIEW_MAX_ITEMS} discrepancies can be reviewed at once.`,
  })
  @ArrayUnique({ message: 'varianceIds must not repeat.' })
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  varianceIds: number[];
}
