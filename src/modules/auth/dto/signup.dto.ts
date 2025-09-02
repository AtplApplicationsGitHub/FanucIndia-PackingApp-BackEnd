import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'test@mail.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8, description: 'Password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'SALES',
    description: 'User role (SALES or ADMIN only)',
    enum: ['SALES', 'ADMIN'],
    default: 'SALES',
  })
  @IsString()
  @IsIn(['SALES', 'ADMIN'], { message: 'role must be either SALES or ADMIN' })
  role: string;
}

