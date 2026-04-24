import { ApiProperty } from '@nestjs/swagger';

export class AdminErpImportCountsDto {
  @ApiProperty({ example: 25 })
  PendingImport: number;

  @ApiProperty({ example: 80 })
  ErpSuccessUpload: number;

  @ApiProperty({ example: 4 })
  ErpImportFailed: number;
}