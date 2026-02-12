import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ErpMaterialDataService } from './erp-material-data.service';
import { UpdateIssueStageDto } from './dto/update-issue-stage.dto';
import { IncrementIssueStageDto } from './dto/increment-issue-stage.dto';
import { UpdatePackingStageDto } from './dto/update-packing-stage.dto';
import { IncrementPackingStageDto } from './dto/increment-packing-stage.dto';
import { BulkAcceptGroupDto } from './dto/bulk-accept-group.dto';
import { UpdateRemarksDto } from './dto/update-remarks.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { UpdateSkipIssueDto } from './dto/update-skip-issue.dto';

@ApiTags('ERP Material Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @Roles('ADMIN', 'USER')
  getMaterialsByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.getMaterialsByOrderId(orderId, userId, role);
  }

  @ApiOperation({ summary: 'Increment issue stage for a material code' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: IncrementIssueStageDto })
  @ApiResponse({
    status: 200,
    description: 'Issue stage incremented successfully.',
  })
  @Post('increment-issue-stage')
  @Roles('ADMIN', 'USER')
  incrementIssueStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: IncrementIssueStageDto,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.incrementIssueStage(
      orderId,
      body.materialCode,
      userId,
      role
    );
  }

  @ApiOperation({ summary: 'Update issue stage for a material code (inline edit)' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: UpdateIssueStageDto })
  @Patch('update-issue-stage')
  @Roles('ADMIN', 'USER')
  updateIssueStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: UpdateIssueStageDto,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.updateIssueStage(
      orderId,
      body.materialCode,
      body.issueStage,
      userId,
      role,
      body.materialId,
    );
  }

  @ApiOperation({ summary: 'Increment packing stage for a material code' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: IncrementPackingStageDto })
  @Post('increment-packing-stage')
  @Roles('ADMIN', 'USER')
  incrementPackingStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: IncrementPackingStageDto,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.incrementPackingStage(
      orderId,
      body.materialCode,
      userId,
      role
    );
  }

  @ApiOperation({ summary: 'Update packing stage for a material code (inline edit)' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: UpdatePackingStageDto })
  @Patch('update-packing-stage')
  @Roles('ADMIN', 'USER')
  updatePackingStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: UpdatePackingStageDto,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.updatePackingStage(
      orderId,
      body.materialCode,
      body.packingStage,
      userId,
      role,
      body.materialId,
    );
  }

  @ApiOperation({ summary: 'Bulk accept items for a specific group' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: BulkAcceptGroupDto })
  @Post('bulk-accept-group')
  @Roles('ADMIN', 'USER')
  bulkAcceptGroup(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: BulkAcceptGroupDto,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.bulkAcceptGroup(
      orderId,
      body.group,
      body.stageType,
      userId,
      role
    );
  }

  @ApiOperation({ summary: 'Update remarks for a material row' })
  @ApiParam({ name: 'orderId', type: Number })
  @ApiParam({ name: 'materialId', type: Number })
  @ApiBody({ type: UpdateRemarksDto })
  @Patch(':materialId/remarks')
  @Roles('ADMIN', 'USER')
  updateRemarks(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('materialId', ParseIntPipe) materialId: number,
    @Body() body: UpdateRemarksDto,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.updateRemarks(
      orderId,
      materialId,
      body.remarks,
      userId,
      role,
    );
  }

  @ApiOperation({ summary: 'Accept all materials for issue stage (Admin only)' })
  @ApiParam({ name: 'orderId', type: Number })
  @Post('accept-all-issue-stage')
  @Roles('ADMIN')
  acceptAllIssueStage(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.acceptAllIssueStage(orderId, userId, role);
  }

  @ApiOperation({ summary: 'Update Mapping Barcode and Group' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: UpdateMappingDto })
  @Patch('update-mapping')
  @Roles('ADMIN', 'USER')
  updateMapping(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: UpdateMappingDto,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.erpMaterialDataService.updateMapping(
      orderId,
      body,
      userId,
      role,
    );
  }

  @Patch(':id/skip-issue')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update Skip Issue Stage flag for a material' })
  async updateSkipIssueStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSkipIssueDto,
  ) {
    return this.erpMaterialDataService.updateSkipIssueStage(id, dto.skipIssueStage);
  }
}
