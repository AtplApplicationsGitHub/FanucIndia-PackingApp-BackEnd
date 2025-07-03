import { IsOptional, IsString, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminOrderDto {
  @ApiPropertyOptional({ example: 'MD', description: 'Order status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1, description: 'Priority value' })
  @IsOptional()
  @IsInt()
  priority?: number;
}
