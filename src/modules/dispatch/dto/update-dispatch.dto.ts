import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateDispatchDto } from './create-dispatch.dto';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateDispatchDto extends PartialType(CreateDispatchDto) {
  @ApiPropertyOptional({
    description: 'LR number to apply to selected sale orders linked with this dispatch.',
    example: 'LR123456',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  LRnumber?: string;

  @ApiPropertyOptional({
    description: 'Alias for LRnumber.',
    example: 'LR123456',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  lrNumber?: string;

  @ApiPropertyOptional({
    description: 'Transporter name to store when a transporter ID is not selected.',
    example: '89',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  transporterName?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Selected Dispatch_SO row IDs to update.',
    example: [1, 2],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((id) => Number(id)) : [Number(value)],
  )
  @IsInt({ each: true })
  dispatchSOIds?: number[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Selected SalesOrder IDs to update LR number for.',
    example: [101, 102],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((id) => Number(id)) : [Number(value)],
  )
  @IsInt({ each: true })
  selectedSalesOrderIds?: number[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Selected sale order numbers to update LR number for.',
    example: ['SO00000251', 'SO00000249'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((so) => String(so).trim()) : [String(value).trim()],
  )
  @IsString({ each: true })
  saleOrderNumbers?: string[];
}
