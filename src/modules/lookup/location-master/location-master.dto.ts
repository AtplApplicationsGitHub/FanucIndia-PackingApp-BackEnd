import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class LocationMasterQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000000)
  page = 1;

  @ApiPropertyOptional({ default: 10, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class DeleteLocationQueryDto {
  @ApiProperty({ example: 'PL1' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^\0]+$/)
  plantCode!: string;

  @ApiProperty({ example: '12-A-12' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^\0]+$/)
  rackNumber!: string;
}
