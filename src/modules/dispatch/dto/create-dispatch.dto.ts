import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsArray, IsInt, Min } from 'class-validator';

export class CreateDispatchDto {

  @ApiPropertyOptional({ description: 'Transporter ID (optional)'})
  @IsOptional()
  @IsNumberString()
  transporterId?: string;

  @ApiPropertyOptional({ description: 'Vehicle Entry ID to create dispatch for a selected vehicle entry.', example: 12 })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  vehicleEntryId?: number;

  @ApiProperty({ description: 'Vehicle registration number.'})
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @ApiPropertyOptional({ type: [String], description: 'List of Sale Order Numbers to be dispatched (optional)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  salesOrderIds?: number[];
}
