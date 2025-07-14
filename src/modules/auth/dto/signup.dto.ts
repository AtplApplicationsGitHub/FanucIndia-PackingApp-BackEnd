import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'test@mail.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8, description: 'Password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'sales',
    description: 'User role (sales or admin only)',
    enum: ['sales', 'admin'],
    default: 'sales',
  })
  @IsString()
  @IsIn(['sales', 'admin'], { message: 'role must be either sales or admin' })
  role: string;
}
