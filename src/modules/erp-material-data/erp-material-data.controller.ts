import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ErpMaterialDataService } from './erp-material-data.service';
import { UpdateIssueStageDto } from './dto/update-issue-stage.dto';
import { IncrementIssueStageDto } from './dto/increment-issue-stage.dto';
import { UpdatePackingStageDto } from './dto/update-packing-stage.dto';
import { IncrementPackingStageDto } from './dto/increment-packing-stage.dto';

@ApiTags('ERP Material Data')
@Controller('admin/orders/:orderId/erp-materials')
export class ErpMaterialDataController {
  constructor(
    private readonly erpMaterialDataService: ErpMaterialDataService,
  ) {}

  @ApiOperation({ summary: 'Get ERP materials for a sales order' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiResponse({
    status: 200,
    description: 'List of ERP materials for the order.',
  })
  @Get()
  getMaterialsByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.erpMaterialDataService.getMaterialsByOrderId(orderId);
  }

  @ApiOperation({ summary: 'Increment issue stage for a material code' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: IncrementIssueStageDto }) // <--- Use the correct DTO
  @ApiResponse({
    status: 200,
    description: 'Issue stage incremented successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot exceed the Required_Qty value.',
  })
  @ApiResponse({ status: 404, description: 'Order or Material not found.' })
  @Post('increment-issue-stage')
  incrementIssueStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: IncrementIssueStageDto, // <--- Use the correct DTO
  ) {
    return this.erpMaterialDataService.incrementIssueStage(
      orderId,
      body.materialCode,
    );
  }

  @ApiOperation({ summary: 'Update issue stage for a material code (inline edit)' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: UpdateIssueStageDto })
  @ApiResponse({
    status: 200,
    description: 'Issue stage updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot exceed the Required_Qty value.',
  })
  @ApiResponse({ status: 404, description: 'Order or Material not found.' })
  @Patch('update-issue-stage')
  updateIssueStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: UpdateIssueStageDto,
  ) {
    return this.erpMaterialDataService.updateIssueStage(
      orderId,
      body.materialCode,
      body.issueStage,
    );
  }

    @ApiOperation({ summary: 'Increment packing stage for a material code' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: IncrementPackingStageDto })
  @ApiResponse({ status: 200, description: 'Packing stage incremented successfully.' })
  @ApiResponse({ status: 400, description: 'Cannot exceed the min(Required_Qty, Issue_stage) cap.' })
  @ApiResponse({ status: 404, description: 'Order or Material not found.' })
  @Post('increment-packing-stage')
  incrementPackingStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: IncrementPackingStageDto,
  ) {
    return this.erpMaterialDataService.incrementPackingStage(
      orderId,
      body.materialCode,
    );
  }

  @ApiOperation({ summary: 'Update packing stage for a material code (inline edit)' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: UpdatePackingStageDto })
  @ApiResponse({ status: 200, description: 'Packing stage updated successfully.' })
  @ApiResponse({ status: 400, description: 'Cannot exceed the min(Required_Qty, Issue_stage) cap.' })
  @ApiResponse({ status: 404, description: 'Order or Material not found.' })
  @Patch('update-packing-stage')
  updatePackingStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: UpdatePackingStageDto,
  ) {
    return this.erpMaterialDataService.updatePackingStage(
      orderId,
      body.materialCode,
      body.packingStage,
    );
  }
}
