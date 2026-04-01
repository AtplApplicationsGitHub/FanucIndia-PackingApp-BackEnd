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
  Res,
  UseGuards,
  ParseIntPipe,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

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
    @Query('paymentClearance') paymentClearance?: string,
    @Query('salesZoneId') salesZoneId?: string,
    @Query('status') status?: string,
    @Query('excludeStatus') excludeStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 10;
    
    return this.service.getPaginatedOrders(
      pageNumber,
      pageSize,
      req.user.userId,
      { search, paymentClearance, salesZoneId, status, excludeStatus, startDate, endDate }
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

  @Post('customer-label/:id/print')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'Print Customer Label using specific IP' })
  @ApiParam({ name: 'id', type: Number, description: 'The ID from the CustomerLabelPrint table' })
  @ApiResponse({ status: 200, description: 'Print job sent successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async printCustomerLabel(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.printCustomerLabel(id);
  }

  @Post('attachments')
  @Roles('SALES', 'ADMIN')
  @ApiOperation({ summary: 'Upload attachments for multiple sales orders' })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadAttachments(
    @Body('salesOrderIds') salesOrderIdsString: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    if (!salesOrderIdsString) {
      throw new BadRequestException('salesOrderIds must be provided');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    let salesOrderIds: number[];
    try {
      if (salesOrderIdsString.startsWith('[')) {
        salesOrderIds = JSON.parse(salesOrderIdsString).map(Number);
      } else {
        salesOrderIds = salesOrderIdsString.split(',').map(Number);
      }
    } catch (e) {
      throw new BadRequestException('Invalid format for salesOrderIds. Expected comma-separated string or JSON array.');
    }

    return this.service.uploadAttachments(salesOrderIds, files, req.user.userId);
  }

  @Get(':id/attachments')
  @Roles('SALES', 'ADMIN', 'USER') // Adjust roles based on who can view the search page
  @ApiOperation({ summary: 'Get a list of attachments for a specific Sales Order' })
  @ApiParam({ name: 'id', type: Number, description: 'The Sales Order ID' })
  async getAttachments(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAttachments(id);
  }

  @Get('attachments/download/:attachmentId')
  @Roles('SALES', 'ADMIN', 'USER')
  @ApiOperation({ summary: 'Download a specific attachment file' })
  @ApiParam({ name: 'attachmentId', type: Number, description: 'The ID of the attachment' })
  async downloadAttachment(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Res() res: Response,
  ) {
    return this.service.downloadAttachment(attachmentId, res);
  }
}
