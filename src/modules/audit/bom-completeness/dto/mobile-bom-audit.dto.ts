import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BOM_AUDIT_CLIENT_SUBMISSION_ID_MAX,
  BOM_AUDIT_LINE_STATUS_VALUES,
  BOM_AUDIT_MAX_ACTUAL_QTY,
  BOM_AUDIT_MAX_DATA_ROWS,
  BOM_AUDIT_MAX_LENGTH,
  BOM_AUDIT_MAX_SUBMIT_LINES,
} from '../bom-audit.constants';

export class StartBomAuditDto {
  @ApiProperty({
    description: 'Time the operator opened the audit on the handheld (ISO-8601 UTC)',
    example: '2026-10-14T06:00:00.000Z',
  })
  @IsISO8601({ strict: true }, { message: 'startedAt must be an ISO-8601 date-time' })
  startedAt!: string;
}

export class SubmitBomMaterialDto {
  @ApiPropertyOptional({
    description:
      'BomAuditMaterial.id from the download. Leave empty for an UNEXPECTED material (scanned but not in the file for this location).',
    example: 9001,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'materialId must be a whole number' })
  @Min(1, { message: 'materialId must be greater than 0' })
  materialId?: number | null;

  @ApiProperty({ example: 'A06B-6110-H015', maxLength: BOM_AUDIT_MAX_LENGTH.materialCode })
  @IsString({ message: 'materialCode must be text' })
  @IsNotEmpty({ message: 'materialCode is required' })
  @MaxLength(BOM_AUDIT_MAX_LENGTH.materialCode, {
    message: `materialCode must be at most ${BOM_AUDIT_MAX_LENGTH.materialCode} characters`,
  })
  materialCode!: string;

  @ApiProperty({ description: 'Scanned quantity', example: 2 })
  @IsInt({ message: 'actualQty must be a whole number' })
  @Min(0, { message: 'actualQty cannot be negative' })
  @Max(BOM_AUDIT_MAX_ACTUAL_QTY, { message: `actualQty must be at most ${BOM_AUDIT_MAX_ACTUAL_QTY}` })
  actualQty!: number;

  @ApiProperty({
    description:
      'Status worked out on the handheld. The server re-calculates it from expected / actual quantity and saves its own value.',
    enum: BOM_AUDIT_LINE_STATUS_VALUES,
  })
  @IsIn(BOM_AUDIT_LINE_STATUS_VALUES, {
    message: `status must be one of: ${BOM_AUDIT_LINE_STATUS_VALUES.join(', ')}`,
  })
  status!: string;

  @ApiPropertyOptional({ example: '2026-10-14T06:19:02.000Z', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'lastScannedAt must be an ISO-8601 date-time' })
  lastScannedAt?: string | null;
}

export class SubmitBomLocationDto {
  @ApiProperty({ description: 'BomAuditLocation.id from the download', example: 501 })
  @IsInt({ message: 'locationId must be a whole number' })
  @Min(1, { message: 'locationId must be greater than 0' })
  locationId!: number;

  @ApiProperty({
    description: 'Time the operator completed this location (ISO-8601 UTC)',
    example: '2026-10-14T06:20:41.000Z',
  })
  @IsISO8601({ strict: true }, { message: 'verifiedAt must be an ISO-8601 date-time' })
  verifiedAt!: string;

  @ApiProperty({ type: [SubmitBomMaterialDto] })
  @IsArray({ message: 'materials must be a list' })
  @ArrayMaxSize(BOM_AUDIT_MAX_SUBMIT_LINES)
  @ValidateNested({ each: true })
  @Type(() => SubmitBomMaterialDto)
  materials!: SubmitBomMaterialDto[];
}

export class SubmitBomAuditDto {
  @ApiProperty({
    description:
      'Random id created once on the handheld for this submission. Sending the same id again (retry) is answered with success and nothing is saved twice.',
    example: '5f1c2d0e-8a3b-4c1d-9f6e-2b7a4c9d1e00',
    maxLength: BOM_AUDIT_CLIENT_SUBMISSION_ID_MAX,
  })
  @IsString({ message: 'clientSubmissionId must be text' })
  @IsNotEmpty({ message: 'clientSubmissionId is required' })
  @MaxLength(BOM_AUDIT_CLIENT_SUBMISSION_ID_MAX)
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'clientSubmissionId may contain only letters, digits and "-"' })
  clientSubmissionId!: string;

  @ApiProperty({ example: '2026-10-14T06:00:00.000Z' })
  @IsISO8601({ strict: true }, { message: 'startedAt must be an ISO-8601 date-time' })
  startedAt!: string;

  @ApiProperty({ description: 'Time Submit was pressed on the handheld', example: '2026-10-14T08:45:10.120Z' })
  @IsISO8601({ strict: true }, { message: 'completedAt must be an ISO-8601 date-time' })
  completedAt!: string;

  @ApiProperty({ type: [SubmitBomLocationDto] })
  @IsArray({ message: 'locations must be a list' })
  @ArrayMinSize(1, { message: 'locations must not be empty' })
  @ArrayMaxSize(BOM_AUDIT_MAX_DATA_ROWS)
  @ValidateNested({ each: true })
  @Type(() => SubmitBomLocationDto)
  locations!: SubmitBomLocationDto[];
}
