import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  CYCLE_COUNT_CNC_FILTER,
  CYCLE_COUNT_CNC_FILTER_VALUES,
  CYCLE_COUNT_MATERIAL_CLASSES,
  CYCLE_COUNT_MAX_LENGTH,
  CYCLE_COUNT_MAX_OPERATORS,
  CYCLE_COUNT_MAX_PLAN_LOCATIONS,
  CYCLE_COUNT_SELECTION_METHOD,
  CYCLE_COUNT_SELECTION_METHOD_VALUES,
} from '../cycle-count.constants';

const upperTrimList = ({ value }: { value: unknown }) =>
  Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v)) : value;

export class CycleCountPlanCriteriaDto {
  @ApiProperty({ description: 'Id from POST /cycle-count/stock-uploads', example: 3 })
  @Type(() => Number)
  @IsInt({ message: 'stockUploadId must be a whole number' })
  @Min(1)
  stockUploadId!: number;

  @ApiProperty({ description: 'Movement analysis from date (YYYY-MM-DD, IST, inclusive)', example: '2026-09-26' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fromDate must be in YYYY-MM-DD format' })
  fromDate!: string;

  @ApiProperty({ description: 'Movement analysis to date (YYYY-MM-DD, IST, inclusive)', example: '2026-10-26' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'toDate must be in YYYY-MM-DD format' })
  toDate!: string;

  @ApiProperty({ description: 'Also count movements of archived orders (ERP_Material_DataArchive)', example: true })
  @IsBoolean({ message: 'includeArchived must be true or false' })
  includeArchived!: boolean;

  @ApiProperty({ enum: CYCLE_COUNT_SELECTION_METHOD_VALUES, example: CYCLE_COUNT_SELECTION_METHOD.BUSIEST })
  @IsIn(CYCLE_COUNT_SELECTION_METHOD_VALUES, {
    message: `selectionMethod must be one of: ${CYCLE_COUNT_SELECTION_METHOD_VALUES.join(', ')}`,
  })
  selectionMethod!: string;

  @ApiProperty({ enum: CYCLE_COUNT_CNC_FILTER_VALUES, example: CYCLE_COUNT_CNC_FILTER.BOTH })
  @IsIn(CYCLE_COUNT_CNC_FILTER_VALUES, { message: `cncFilter must be one of: ${CYCLE_COUNT_CNC_FILTER_VALUES.join(', ')}` })
  cncFilter!: string;

  @ApiProperty({ description: 'Material classes to include', example: ['A', 'B', 'C'], isArray: true, enum: CYCLE_COUNT_MATERIAL_CLASSES })
  @Transform(upperTrimList)
  @IsArray({ message: 'materialClasses must be a list' })
  @ArrayMinSize(1, { message: 'Select at least one material class' })
  @ArrayUnique()
  @IsIn(CYCLE_COUNT_MATERIAL_CLASSES as unknown as string[], { each: true, message: 'materialClasses can only contain A, B, C' })
  materialClasses!: string[];
}

export class PreviewCycleCountPlanDto extends CycleCountPlanCriteriaDto {
  @ApiPropertyOptional({
    description: 'How many locations to pick (BUSIEST / RANDOM). Not used for MANUAL.',
    example: 20,
    maximum: CYCLE_COUNT_MAX_PLAN_LOCATIONS,
  })
  @ValidateIf((o: PreviewCycleCountPlanDto) => o.selectionMethod !== CYCLE_COUNT_SELECTION_METHOD.MANUAL)
  @Type(() => Number)
  @IsInt({ message: 'locationCount must be a whole number' })
  @Min(1, { message: 'locationCount must be at least 1' })
  @Max(CYCLE_COUNT_MAX_PLAN_LOCATIONS, { message: `locationCount must be at most ${CYCLE_COUNT_MAX_PLAN_LOCATIONS}` })
  locationCount?: number;

  @ApiPropertyOptional({
    description: 'MANUAL only: the storage bins the admin ticked. Empty = only list the candidates.',
    example: ['16-C-32', '12-B-07'],
    type: [String],
  })
  @IsOptional()
  @Transform(upperTrimList)
  @IsArray()
  @ArrayMaxSize(CYCLE_COUNT_MAX_PLAN_LOCATIONS)
  @ArrayUnique({ message: 'storageBins must not repeat' })
  @IsString({ each: true })
  @MaxLength(CYCLE_COUNT_MAX_LENGTH.storageBin, { each: true })
  storageBins?: string[];
}

export class CreateCycleCountDto extends CycleCountPlanCriteriaDto {
  @ApiProperty({ example: 'Cycle Count - Oct Week 4', maxLength: CYCLE_COUNT_MAX_LENGTH.auditName })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value))
  @IsString({ message: 'auditName must be text' })
  @IsNotEmpty({ message: 'Audit Name is required' })
  @MaxLength(CYCLE_COUNT_MAX_LENGTH.auditName)
  auditName!: string;

  @ApiProperty({
    description: 'Storage bins of the previewed plan (exactly what the admin saw)',
    example: ['16-C-32', '12-B-07'],
    type: [String],
  })
  @Transform(upperTrimList)
  @IsArray({ message: 'storageBins must be a list' })
  @ArrayMinSize(1, { message: 'The plan has no locations' })
  @ArrayMaxSize(CYCLE_COUNT_MAX_PLAN_LOCATIONS)
  @ArrayUnique({ message: 'storageBins must not repeat' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(CYCLE_COUNT_MAX_LENGTH.storageBin, { each: true })
  storageBins!: string[];

  @ApiProperty({ description: 'Operators (USER role). The locations are shared between them, one audit each.', example: [12, 15], type: [Number] })
  @IsArray({ message: 'operatorIds must be a list' })
  @ArrayMinSize(1, { message: 'Select at least one operator' })
  @ArrayMaxSize(CYCLE_COUNT_MAX_OPERATORS)
  @ArrayUnique({ message: 'operatorIds must not repeat' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'operatorIds must be whole numbers' })
  @Min(1, { each: true })
  operatorIds!: number[];
}
