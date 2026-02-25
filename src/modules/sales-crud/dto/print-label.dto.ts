import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class PrintLabelDto {
  @IsOptional()
  @IsInt()
  printerId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  quantity?: number = 1;
}