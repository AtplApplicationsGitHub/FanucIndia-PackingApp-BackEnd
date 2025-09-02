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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Delete } from '@nestjs/common';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/sales-orders')
export class AdminOrderController {
  constructor(private readonly service: AdminOrderService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all sales orders (admin only)' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'product',
    required: false,
    type: String,
    description: 'Filter by product ID or name',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter by delivery date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Results per page',
  })
  @ApiResponse({
    status: 200,
    description: 'List of sales orders returned successfully',
  })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a specific sales order (admin only)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the sales order to update',
  })
  @ApiBody({ type: UpdateAdminOrderDto })
  @ApiResponse({ status: 200, description: 'Sales order updated successfully' })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminOrderDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a specific sales order (admin only)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the sales order to delete',
  })
  @ApiResponse({ status: 200, description: 'Sales order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
