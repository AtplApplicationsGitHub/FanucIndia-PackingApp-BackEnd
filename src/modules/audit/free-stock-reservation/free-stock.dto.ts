import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize, ArrayUnique, Equals, IsArray, IsBoolean, IsIn,
  IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FreeStockPageDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 25, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 25;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

}

export class FreeStockQueryDto extends FreeStockPageDto {
  @ApiPropertyOptional({ description: 'Reservation owner Sales Zone ID. Omit for all zones.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId?: number;

  @ApiPropertyOptional({ enum: ['ALL', '0_30', '31_90', 'OVER_90'], description: 'Reserved calendar days in IST: 0–30 inclusive, 31–90 inclusive, or over 90.' })
  @IsOptional()
  @IsIn(['ALL', '0_30', '31_90', 'OVER_90'])
  reservedDays?: 'ALL' | '0_30' | '31_90' | 'OVER_90';

  @ApiPropertyOptional({ enum: ['ALL', 'OPEN', 'RESERVED', 'CLOSED'] })
  @IsOptional()
  @IsIn(['ALL', 'OPEN', 'RESERVED', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value)
  @IsBoolean()
  mine?: boolean;
}

export class StockSnapshotDto {
  @ApiProperty({ description: 'Token returned by the preview for this file.' })
  @IsString()
  @MaxLength(1000)
  previewToken!: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], description: 'Explicit approval to skip invalid rows. Existing matching stock is preserved.' })
  @IsOptional()
  @IsIn(['true', 'false'])
  skipInvalidRows?: string;

  @ApiProperty({ enum: ['true'] })
  @Equals('true', { message: 'confirmFullSnapshot must be true: this file must contain the complete current SAP stock list.' })
  confirmFullSnapshot!: string;
}

export class FreeStockReservationLineDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  storageBin!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  materialCode!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  batch!: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'number' }] })
  @Transform(({ value }: { value: unknown }) => typeof value === 'number' ? String(value) : value)
  @IsString()
  @MaxLength(32)
  qty!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  soNumber?: string;
}

export class ReserveFreeStockDto {
  @ApiProperty({ type: [FreeStockReservationLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FreeStockReservationLineDto)
  lines!: FreeStockReservationLineDto[];
}

export class ConfirmSelectedFreeStockDto extends ReserveFreeStockDto {
  @ApiProperty({ description: 'Signed preview token for these selected rows and quantities.' })
  @IsString()
  @MaxLength(1000)
  previewToken!: string;
}

export class ConfirmBulkFreeStockDto {
  @ApiProperty({ description: 'Signed token returned by the bulk preview; valid for 15 minutes.' })
  @IsString()
  @MaxLength(1000)
  previewToken!: string;
}

export class ReleaseFreeStockDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  stockItemIds!: number[];
}
