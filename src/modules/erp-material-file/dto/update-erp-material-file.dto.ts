import { PartialType } from '@nestjs/swagger';
import { CreateErpMaterialFileDto } from './create-erp-material-file.dto';

export class UpdateErpMaterialFileDto extends PartialType(CreateErpMaterialFileDto) {}
