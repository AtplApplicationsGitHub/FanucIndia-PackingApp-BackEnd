import { IsOptional, IsDateString } from 'class-validator';

export class QueryEfficiencyDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}