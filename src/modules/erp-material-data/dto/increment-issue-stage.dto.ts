import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IncrementIssueStageDto {
  @ApiProperty({ example: 'MAT-12345', description: 'The material code.' })
  @IsString()
  materialCode: string;
}
