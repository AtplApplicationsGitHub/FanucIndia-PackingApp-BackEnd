import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateBomAuditDto {
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
