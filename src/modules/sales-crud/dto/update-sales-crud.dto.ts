import { PartialType } from '@nestjs/mapped-types';
import { CreateSalesCrudDto } from './create-sales-crud.dto';

export class UpdateSalesCrudDto extends PartialType(CreateSalesCrudDto) {}
