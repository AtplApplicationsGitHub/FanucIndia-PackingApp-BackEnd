import {
  Controller, Get, Post, Body, Param, Put, Delete, Req, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { SalesCrudService } from './sales-crud.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Sales Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-crud')
export class SalesCrudController {
  constructor(private readonly service: SalesCrudService) {}

  @Post()
  @Roles('sales')
  create(@Body() dto: CreateSalesCrudDto, @Req() req) {
    return this.service.create(dto, req.user.userId);
  }

  @Get()
  @Roles('sales')
  findAll(@Req() req) {
    return this.service.findAll(req.user.userId, req.query);
  }

  @Get(':id')
  @Roles('sales')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.findOne(id, req.user.userId);
  }

  @Put(':id')
  @Roles('sales')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSalesCrudDto,
    @Req() req,
  ) {
    return this.service.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles('sales')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }
}
