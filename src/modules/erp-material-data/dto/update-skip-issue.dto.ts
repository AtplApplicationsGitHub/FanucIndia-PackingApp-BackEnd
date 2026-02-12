import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSkipIssueDto {
  @ApiProperty({ description: 'Flag to skip issue stage', example: true })
  @IsNotEmpty()
  @IsBoolean()
  skipIssueStage: boolean;
}