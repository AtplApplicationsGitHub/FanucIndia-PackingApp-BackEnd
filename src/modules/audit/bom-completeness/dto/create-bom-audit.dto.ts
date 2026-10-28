import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { BOM_AUDIT_MAX_LENGTH, BOM_AUDIT_MAX_OPERATOR_ID } from '../bom-audit.constants';

export class CreateBomAuditDto {
  @ApiProperty({
    description: 'Audit name typed by the admin on the screen (the same name is used for every audit created from the file).',
    example: 'BOM Audit - Rack 12 - Oct Week 2',
    maxLength: BOM_AUDIT_MAX_LENGTH.auditName,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString({ message: 'auditName must be text' })
  @IsNotEmpty({ message: 'Audit Name is required' })
  @MaxLength(BOM_AUDIT_MAX_LENGTH.auditName, {
    message: `Audit Name must be at most ${BOM_AUDIT_MAX_LENGTH.auditName} characters`,
  })
  auditName!: string;
}

export class ReassignBomAuditDto {
  @ApiProperty({ description: 'New operator: User ID of a Terminal Operator (role USER)', example: 15 })
  @Type(() => Number)
  @IsInt({ message: 'operatorId must be a valid user ID' })
  @Min(1, { message: 'operatorId must be greater than 0' })
  @Max(BOM_AUDIT_MAX_OPERATOR_ID, { message: 'operatorId is not a valid user ID' })
  operatorId!: number;
}
