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
  @ApiProperty({ enum: ['true'] })
  @Equals('true', { message: 'confirmFullSnapshot must be true: this file must contain the complete current SAP stock list.' })
  confirmFullSnapshot!: string;
}

export class FreeStockReservationLineDto {
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

export class ReleaseFreeStockDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  stockItemIds!: number[];
}
