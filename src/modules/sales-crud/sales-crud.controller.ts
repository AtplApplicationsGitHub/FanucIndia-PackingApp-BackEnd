import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SalesCrudService } from './sales-crud.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Sales Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-crud')
export class SalesCrudController {
  constructor(private readonly service: SalesCrudService) {}

  @Post()
  @Roles('sales')
  @ApiOperation({ summary: 'Create a new sales order' })
  @ApiBody({ type: CreateSalesCrudDto })
  @ApiResponse({ status: 201, description: 'Sales order created successfully' })
  create(@Body() dto: CreateSalesCrudDto, @Req() req) {
    return this.service.create(dto, req.user.userId);
  }

  @Get()
  @Roles('sales')
  @ApiOperation({ summary: 'Get paginated sales orders for the user' })
  @ApiResponse({ status: 200, description: 'Sales orders retrieved' })
  async findAll(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    const userId = req.user.userId;

    return this.service.getPaginatedOrders(pageNumber, pageSize, userId, search);
  }

  @Get(':id')
  @Roles('sales')
  @ApiOperation({ summary: 'Get a specific sales order by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Sales order found' })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.findOne(id, req.user.userId);
  }

  @Put(':id')
  @Roles('sales')
  @ApiOperation({ summary: 'Update a specific sales order by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSalesCrudDto })
  @ApiResponse({ status: 200, description: 'Sales order updated' })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSalesCrudDto,
    @Req() req,
  ) {
    return this.service.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles('sales')
  @ApiOperation({ summary: 'Delete a sales order by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Sales order deleted' })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }
}
