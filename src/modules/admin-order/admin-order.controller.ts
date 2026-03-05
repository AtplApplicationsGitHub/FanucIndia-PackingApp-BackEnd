import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
  UseInterceptors,
  UploadedFile,
  Post,
  Delete,
  BadRequestException
} from '@nestjs/common';
import { AdminOrderService } from './admin-order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateAdminOrderDto } from './dto/update-admin-order.dto';
import { BulkAssignOrderDto } from './dto/bulk-assign-order.dto';
import { BulkSkipStageDto } from './dto/bulk-skip-stage.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthRequest } from '../auth/types/auth-request.type';
import { FileInterceptor } from '@nestjs/platform-express';

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
  findAll(@Query() query: any, @Req() req: AuthRequest) {
    return this.service.findAll(query, req.user);
  }

  @Patch('bulk-assign')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk assign users to multiple sales orders' })
  @ApiBody({ type: BulkAssignOrderDto })
  @ApiResponse({ status: 200, description: 'Orders assigned successfully' })
  async bulkAssign(@Body() dto: BulkAssignOrderDto, @Req() req: AuthRequest) {
    return this.service.bulkAssign(dto, req.user);
  }

  @Patch('bulk-skip-stage')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Bulk update Skip Stage for multiple sales orders',
  })
  @ApiBody({ type: BulkSkipStageDto })
  @ApiResponse({
    status: 200,
    description: 'Orders updated successfully with info about skipped orders',
  })
  async bulkUpdateSkipStage(@Body() dto: BulkSkipStageDto) {
    return this.service.bulkUpdateSkipStage(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Update a specific sales order (admin and user roles)',
  })
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
    @Req() req: AuthRequest,
  ) {
    return this.service.update(id, dto, req.user);
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

  @Get('active-export-list')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Fetch specific columns for Active Orders (NULL, R105, W105)',
  })
  async fetchActiveOrders() {
    return this.service.fetchActiveOrders();
  }

  @Post('excel-import')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update sales orders via Excel Import' })
  @UseInterceptors(FileInterceptor('file'))
  async importExcelUpdates(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.service.processExcelImport(file.buffer, req.user);
  }
}
