import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  RECON_DECISION_VALUES,
  RECON_DEFAULT_SAP_ACTION,
  RECON_SAP_ACTION_VALUES,
} from '../../shared/reconciliation-options';

export class ReviewReconciliationDto {
  @ApiProperty({
    enum: RECON_DECISION_VALUES,
  })
  @IsIn(RECON_DECISION_VALUES)
  decision: string;

  @ApiPropertyOptional({
    enum: RECON_SAP_ACTION_VALUES,
    default: RECON_DEFAULT_SAP_ACTION,
  })
  @IsOptional()
  @IsIn(RECON_SAP_ACTION_VALUES)
  sapAction?: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Remarks are required.' })
  @MaxLength(2000)
  remarks: string;
}
