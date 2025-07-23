import { IsEmail, IsNotEmpty, IsString, IsIn, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'user@mail.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8, description: 'Password (min 8 chars)' })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'sales',
    description: 'User role (sales, admin, user)',
    enum: ['sales', 'admin', 'user'],
    default: 'sales',
  })
  @IsNotEmpty()
  @IsIn(['admin', 'sales', 'user'])
  role: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Smith', description: 'Full name of the user' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'jane@mail.com', description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword123', minLength: 8, description: 'Password (min 8 chars)' })
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    example: 'user',
    description: 'User role (sales, admin, user)',
    enum: ['sales', 'admin', 'user'],
    default: 'user',
  })
  @IsOptional()
  @IsIn(['admin', 'sales', 'user'])
  role?: string;
}
