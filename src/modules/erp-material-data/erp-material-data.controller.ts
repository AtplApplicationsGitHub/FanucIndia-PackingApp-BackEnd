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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';

@ApiTags('ERP Material Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/orders/:orderId/erp-materials') // Keep the URL for simplicity, but secure the methods
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
  @Roles('admin', 'user') // Allow both admins and users
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
  @Roles('admin', 'user') // Allow both admins and users
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
  @Roles('admin', 'user') // Allow both admins and users
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
      role
    );
  }

    @ApiOperation({ summary: 'Increment packing stage for a material code' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Sales Order ID' })
  @ApiBody({ type: IncrementPackingStageDto })
  @Post('increment-packing-stage')
  @Roles('admin', 'user') // Allow both admins and users
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
  @Roles('admin', 'user') // Allow both admins and users
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
      role
    );
  }
}
