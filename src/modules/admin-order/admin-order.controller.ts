import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminOrderService } from './admin-order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateAdminOrderDto } from './dto/update-admin-order.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/sales-orders')
export class AdminOrderController {
  constructor(private readonly service: AdminOrderService) {}

  @Get()
  @Roles('admin')
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminOrderDto,
  ) {
    return this.service.update(id, dto);
  }
}
