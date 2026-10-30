import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/roles.decorator';
import { AuthRequest } from '../../auth/types/auth-request.type';
import { ReconciliationService } from './reconciliation.service';
import { ReviewReconciliationDto } from './dto/review-reconciliation.dto';

@ApiTags('Audit - Reconciliation')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('audit/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get(':auditType/:id')
  @ApiOperation({
    summary: 'Get audit reconciliation details and discrepancies',
  })
  @ApiParam({
    name: 'auditType',
    enum: ['BOM_COMPLETENESS', 'CYCLE_COUNT', 'LOCATION_AUDIT', 'FREE_STOCK'],
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation detail fetched successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Audit not found',
  })
  detail(
    @Param('auditType') auditType: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reconciliationService.detail(auditType, id);
  }

  @Patch(':auditType/:id/variances/:varianceId')
  @ApiOperation({
    summary: 'Review and resolve an audit discrepancy',
  })
  @ApiParam({
    name: 'auditType',
    enum: ['BOM_COMPLETENESS', 'CYCLE_COUNT', 'LOCATION_AUDIT', 'FREE_STOCK'],
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'varianceId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Discrepancy reviewed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Audit or discrepancy not found',
  })
  review(
    @Param('auditType') auditType: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('varianceId', ParseIntPipe) varianceId: number,
    @Body() dto: ReviewReconciliationDto,
    @Req() req: AuthRequest,
  ) {
    return this.reconciliationService.review(
      auditType,
      id,
      varianceId,
      dto,
      req.user.name,
    );
  }

  @Post(':auditType/:id/close')
  @ApiOperation({
    summary: 'Close an audit after resolving all discrepancies',
  })
  @ApiParam({
    name: 'auditType',
    enum: ['BOM_COMPLETENESS', 'CYCLE_COUNT', 'LOCATION_AUDIT', 'FREE_STOCK'],
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Audit closed successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Unresolved discrepancies remain',
  })
  close(
    @Param('auditType') auditType: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.reconciliationService.close(auditType, id, req.user.name);
  }
}
