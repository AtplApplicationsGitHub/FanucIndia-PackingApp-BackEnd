import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateVehicleEntryDto {
  @ApiPropertyOptional({
    example: 'MH12AB1234',
    description: 'Updated vehicle registration number',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  vehicleNumber?: string;

  @ApiPropertyOptional({
    example: 'VRL Logistics',
    description: 'Updated transporter name',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  transporterName?: string;
}
