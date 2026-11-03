import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
import { BulkReviewReconciliationDto } from './dto/bulk-review-reconciliation.dto';
import { QueryReconciliationLinesDto } from './dto/query-reconciliation-lines.dto';

@ApiTags('Audit - Reconciliation')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('audit/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('options')
  @ApiOperation({
    summary: 'Decision and SAP follow-up options for the review forms (value + label), from the backend constants',
  })
  @ApiResponse({ status: 200, description: 'decisions[], sapActions[], defaultSapAction' })
  options() {
    return this.reconciliationService.options();
  }

  @Get(':auditType/:id')
  @ApiOperation({
    summary:
      'Audit reconciliation summary: cards (incl. line and quantity accuracy), location-wise variance, pill, canReview / canClose. Lines come from GET .../lines. IN_PROGRESS = uploaded locations only, read-only.',
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

  @Get(':auditType/:id/lines')
  @ApiOperation({
    summary:
      'Audit lines for the Discrepancy table, filtered and paged on the server (search, storage bin, category, status). ' +
      'Works for IN_PROGRESS audits too (read-only): locations not uploaded yet come back with pending = true.',
  })
  @ApiParam({
    name: 'auditType',
    enum: ['BOM_COMPLETENESS', 'CYCLE_COUNT', 'LOCATION_AUDIT', 'FREE_STOCK'],
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'One page of audit lines + pagination' })
  @ApiResponse({ status: 404, description: 'Audit not found' })
  @ApiResponse({ status: 409, description: 'Audit not downloaded to the handheld yet' })
  lines(
    @Param('auditType') auditType: string,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryReconciliationLinesDto,
  ) {
    return this.reconciliationService.lines(auditType, id, query);
  }

  @Patch(':auditType/:id/variances/bulk')
  @ApiOperation({
    summary: 'Review and resolve many audit discrepancies at once',
  })
  @ApiParam({
    name: 'auditType',
    enum: ['BOM_COMPLETENESS', 'CYCLE_COUNT', 'LOCATION_AUDIT', 'FREE_STOCK'],
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Discrepancies reviewed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Audit or one of the discrepancies not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Audit is not pending reconciliation',
  })
  bulkReview(
    @Param('auditType') auditType: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkReviewReconciliationDto,
    @Req() req: AuthRequest,
  ) {
    return this.reconciliationService.bulkReview(
      auditType,
      id,
      dto,
      req.user.name,
    );
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
