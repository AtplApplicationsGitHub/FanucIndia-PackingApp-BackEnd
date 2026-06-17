import { IsOptional, IsDateString, IsIn } from 'class-validator';

export class QueryEfficiencyDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['Issue', 'Packing'])
  stage?: 'Issue' | 'Packing';
}