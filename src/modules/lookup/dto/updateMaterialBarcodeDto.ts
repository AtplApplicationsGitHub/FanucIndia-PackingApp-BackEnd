import { PartialType } from '@nestjs/swagger';
import { CreateMaterialBarcodeDto } from './createMaterialBarcodeDto';

export class UpdateMaterialBarcodeDto extends PartialType(CreateMaterialBarcodeDto) {}