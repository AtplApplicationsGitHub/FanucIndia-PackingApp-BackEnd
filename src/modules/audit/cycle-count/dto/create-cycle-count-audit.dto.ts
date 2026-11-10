import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { IntersectionType } from '@nestjs/swagger';
import { CreateBomAuditDto } from '../../bom-completeness/dto/create-bom-audit.dto';

export class PreviewCycleCountAuditDto {
  @ApiProperty({ example: '2026-10-02', description: 'Issue Updated Date from, inclusive, IST. YYYY-MM-DD.' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate!: string;

  @ApiProperty({ example: '2026-11-02', description: 'Issue Updated Date to, inclusive, IST. At most one calendar month after fromDate.' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate!: string;
}

export class CreateCycleCountAuditDto extends IntersectionType(CreateBomAuditDto, PreviewCycleCountAuditDto) {}
