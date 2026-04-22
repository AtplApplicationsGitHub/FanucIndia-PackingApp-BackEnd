import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadErpMaterialFileDto {
  @ApiProperty({
    description: 'The unique Sales Order ID to bind this file to a specific variant',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'A JSON string mapping each original filename to its description.',
    example: '{"photo1.jpg": "Picture of the packed items"}',
  })
  @IsString()
  @IsNotEmpty()
  descriptions: string;
}