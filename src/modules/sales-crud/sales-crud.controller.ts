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
import { PrintLabelDto } from './dto/print-label.dto';
import { LabelPrintDto } from './dto/label-print.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Sales Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-crud')
export class SalesCrudController {
  constructor(private readonly service: SalesCrudService) {}

  @Get('verify-so/:soNumber')
  @Roles('USER')
  @ApiOperation({
    summary: 'Verify SO Number and retrieve Customer details for Label Print',
  })
  @ApiParam({
    name: 'soNumber',
    type: String,
    description: 'The Sale Order Number to verify',
  })
  @ApiResponse({
    status: 200,
    description: 'Valid SO Number, returns customer details.',
  })
  @ApiResponse({ status: 404, description: 'Invalid SO Number.' })
  verifySoNumber(@Param('soNumber') soNumber: string) {
    return this.service.verifySoNumber(soNumber);
  }

  @Post()
  @Roles('SALES')
  @ApiOperation({ summary: 'Create a new sales order' })
  @ApiBody({ type: CreateSalesCrudDto })
  @ApiResponse({ status: 201, description: 'Sales order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request (validation/business error)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict (duplicate order)' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Body() dto: CreateSalesCrudDto, @Req() req) {
    return this.service.create(dto, req.user.userId);
  }

  @Get()
  @Roles('SALES')
  @ApiOperation({ summary: 'Get paginated sales orders for the user' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'SO123' })
  @ApiResponse({ status: 200, description: 'Sales orders retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    return this.service.getPaginatedOrders(
      pageNumber,
      pageSize,
      req.user.userId,
      search,
    );
  }

  @Get(':id')
  @Roles('SALES')
  @ApiOperation({ summary: 'Get a specific sales order by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Sales order found' })
  @ApiResponse({ status: 404, description: 'Not found or access denied' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.findOne(id, req.user.userId);
  }

  @Put(':id')
  @Roles('SALES')
  @ApiOperation({ summary: 'Update a specific sales order by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSalesCrudDto })
  @ApiResponse({ status: 200, description: 'Sales order updated' })
  @ApiResponse({
    status: 400,
    description: 'Bad request (validation/business error)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Conflict (unique constraint)' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSalesCrudDto,
    @Req() req,
  ) {
    return this.service.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles('SALES')
  @ApiOperation({ summary: 'Delete a sales order by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Sales order deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.service.remove(id, req.user.userId);
  }

  @Post('label-print')
  @Roles('USER', 'ADMIN', 'SALES')
  @ApiOperation({
    summary: 'Update status to Ready for Dispatch on Label Print',
  })
  @ApiBody({ type: LabelPrintDto })
  @ApiResponse({ status: 200, description: 'Status updated successfully.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  printLabels(@Body() dto: LabelPrintDto, @Req() req) {
    return this.service.processLabelPrint(dto, req.user.userId);
  }

  @Post(':id/print')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'Print Order Label' })
  async printLabel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PrintLabelDto,
  ) {
    return this.service.printOrderLabel(id, dto);
  }
}
