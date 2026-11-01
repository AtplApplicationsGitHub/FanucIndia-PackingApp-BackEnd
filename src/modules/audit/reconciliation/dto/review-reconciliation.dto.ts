import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReviewReconciliationDto {
  @ApiProperty({
    enum: ['CORRECT_SYSTEM_RECORD', 'CORRECT_PHYSICAL_STOCK'],
  })
  @IsIn(['CORRECT_SYSTEM_RECORD', 'CORRECT_PHYSICAL_STOCK'])
  decision: string;

  @ApiPropertyOptional({
    enum: ['NONE', 'FLAG_FOR_ADJUSTMENT'],
    default: 'NONE',
  })
  @IsOptional()
  @IsIn(['NONE', 'FLAG_FOR_ADJUSTMENT'])
  sapAction?: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Remarks are required.' })
  @MaxLength(2000)
  remarks: string;
}
