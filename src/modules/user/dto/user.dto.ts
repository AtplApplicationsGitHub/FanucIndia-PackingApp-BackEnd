import {
  IsString,
  MinLength,
  IsIn,
  ValidateIf,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john.doe@example.com or johndoe' })
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Password (min 8 chars for Admin/Sales, 4-digit PIN for User)',
  })
  @IsString()
  @ValidateIf((o) => o.role !== 'USER')
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @ValidateIf((o) => o.role === 'USER')
  @Matches(/^\d{4}$/, {
    message: 'Password must be a 4-digit PIN for the USER role',
  })
  password: string;

  @ApiProperty({
    example: 'USER',
    enum: ['ADMIN', 'SALES', 'USER'],
  })
  @IsString()
  @IsIn(['ADMIN', 'SALES', 'USER'])
  role: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'Optional new password',
    required: false,
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.role !== 'USER' && o.password)
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @ValidateIf((o) => o.role === 'USER' && o.password)
  @Matches(/^\d{4}$/, {
    message: 'Password must be a 4-digit PIN for the USER role',
  })
  password?: string;
}