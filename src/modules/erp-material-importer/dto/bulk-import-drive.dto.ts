import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkImportDriveDto {
  @ApiProperty({ 
    description: 'List of Sale Order Numbers to import from drive', 
    type: [String],
    example: ['SO_001', 'SO_002']
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  saleOrderNumbers: string[];
}