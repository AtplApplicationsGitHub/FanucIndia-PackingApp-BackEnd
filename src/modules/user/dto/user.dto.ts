import {
  IsString,
  MinLength,
  IsIn,
  ValidateIf,
  Matches,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsInt
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

  @ApiProperty({ description: 'Sales Zone ID (Required if role is SALES)', required: false })
  @ValidateIf((o) => o.role === 'SALES')
  @IsNotEmpty({ message: 'Sales Zone is required when the role is SALES' })
  @IsInt()
  salesZoneId?: number;

  @ApiProperty({ description: 'Access to Pick & Pack module', required: false })
  @IsOptional()
  @IsBoolean()
  accessPickPack?: boolean;

  @ApiProperty({ description: 'Access to Customer Label Print module', required: false })
  @IsOptional()
  @IsBoolean()
  accessLabelPrint?: boolean;

  @ApiProperty({ description: 'Access to Material FG/Transfer module', required: false })
  @IsOptional()
  @IsBoolean()
  accessMaterialFgTransfer?: boolean;

  @ApiProperty({ description: 'Access to Material Dispatch module', required: false })
  @IsOptional()
  @IsBoolean()
  accessMaterialDispatch?: boolean;

  @ApiProperty({ description: 'Access to Vehicle Entry module', required: false })
  @IsOptional()
  @IsBoolean()
  accessVehicleEntry?: boolean;

  @ApiProperty({ description: 'Access to Location Accuracy module', required: false })
  @IsOptional()
  @IsBoolean()
  accessLocationAccuracy?: boolean;

  @ApiProperty({ description: 'Access to Content Accuracy module', required: false })
  @IsOptional()
  @IsBoolean()
  accessContentAccuracy?: boolean;

  @ApiProperty({ description: 'Access to Put Away module', required: false })
  @IsOptional()
  @IsBoolean()
  accessPutAway?: boolean;

  @ApiProperty({ description: 'Access to ERP Barcode module', required: false })
  @IsOptional()
  @IsBoolean()
  accessErpBarcode?: boolean;
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

export class ResetPasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ description: 'New password/PIN' })
  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}