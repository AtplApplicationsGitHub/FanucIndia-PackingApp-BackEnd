import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIssueStageDto {
  @ApiProperty({ example: 'MAT-12345', description: 'The material code.' })
  @IsString()
  materialCode: string;

  @ApiProperty({ example: 2, description: 'The new issue stage value.' })
  @IsInt()
  @Min(0)
  issueStage: number;
}
