import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { BOM_AUDIT_MAX_LENGTH } from '../bom-audit.constants';

export class CreateBomAuditDto {
  @ApiProperty({
    description: 'Audit name typed by the admin',
    example: 'BOM Audit - Rack 12 - Oct Week 2',
    maxLength: BOM_AUDIT_MAX_LENGTH.auditName,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? ''
      : typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ')
        : value,
  )
  @IsString({ message: 'auditName must be text' })
  @IsNotEmpty({ message: 'Audit Name is required' })
  @MaxLength(BOM_AUDIT_MAX_LENGTH.auditName, {
    message: `Audit Name must be at most ${BOM_AUDIT_MAX_LENGTH.auditName} characters`,
  })
  auditName: string = '';

  @ApiProperty({
    description:
      'User ID of the operator (USER role) who will perform the audit',
    example: 12,
  })
  @Type(() => Number)
  @IsInt({ message: 'operatorId must be a valid user ID' })
  @Min(1, { message: 'operatorId must be greater than 0' })
  operatorId!: number;
}
