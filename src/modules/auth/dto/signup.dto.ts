import {
  IsEmail,
  IsString,
  MinLength,
  IsIn,
  ValidateIf,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'test@mail.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 8 chars for Admin/Sales, 4-digit PIN for User)',
  })
  @IsString()
  // Only apply the MinLength validator if the role is NOT 'USER'
  @ValidateIf((o) => o.role !== 'USER')
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  // Only apply the Matches validator if the role IS 'USER'
  @ValidateIf((o) => o.role === 'USER')
  @Matches(/^\d{4}$/, {
    message: 'Password must be a 4-digit PIN for the USER role',
  })
  password: string;

  @ApiProperty({
    example: 'SALES',
    description: 'User role (SALES, ADMIN or USER)',
    enum: ['SALES', 'ADMIN', 'USER'],
  })
  @IsString()
  @IsIn(['SALES', 'ADMIN', 'USER'], {
    message: 'Role must be either SALES, ADMIN, or USER',
  })
  role: string;
}