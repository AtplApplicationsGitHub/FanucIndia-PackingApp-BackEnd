import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { BOM_AUDIT_MAX_LENGTH } from '../bom-audit.constants';

export class CreateBomAuditDto {
  @ApiPropertyOptional({
    description:
      'Audit name typed by the admin. Not needed when the template "Audit Name" cell is filled (the file value is used).',
    example: 'BOM Audit - Rack 12 - Oct Week 2',
    maxLength: BOM_AUDIT_MAX_LENGTH.auditName,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ') || undefined
        : value,
  )
  @IsOptional()
  @IsString({ message: 'auditName must be text' })
  @IsNotEmpty({ message: 'Audit Name is required' })
  @MaxLength(BOM_AUDIT_MAX_LENGTH.auditName, {
    message: `Audit Name must be at most ${BOM_AUDIT_MAX_LENGTH.auditName} characters`,
  })
  auditName?: string;

  @ApiPropertyOptional({
    description:
      'User ID of the operator (USER role) who will perform the audit. Only for a file WITHOUT an Operator column.',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'operatorId must be a valid user ID' })
  @Min(1, { message: 'operatorId must be greater than 0' })
  operatorId?: number;
}
