import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateManualFgStorageDto } from './dto/create-manual-fg-storage.dto';
import { ManualFgStoragePayloadPipe } from './manual-fg-storage-payload.pipe';
import { ManualFgStorageService } from './manual-fg-location.service';

@ApiTags('Manual FG Location')
@Controller('manual-fg-location')
export class ManualFgStorageController {
  constructor(private readonly service: ManualFgStorageService) {}

  @Get('list')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get manual FG location list for web admin',
  })
  @ApiQuery({
    name: 'salesOrderNumber',
    required: false,
    description: 'Filter records by sales order number',
    example: 'SO12345',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description:
      'Filter records by storage date in YYYY-MM-DD format. If omitted, all dates are returned.',
    example: '2026-06-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual FG location details fetched successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Bearer token is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only ADMIN can access this API.',
  })
  findAll(
    @Query('salesOrderNumber') salesOrderNumber?: string,
    @Query('date') date?: string,
  ) {
    return this.service.findAll(salesOrderNumber, date);
  }

  @Get('download-excel')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download manual FG storage list as Excel for web admin',
  })
  @ApiQuery({
    name: 'salesOrderNumber',
    required: false,
    description: 'Filter records by sales order number',
    example: 'SO12345',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description:
      'Filter records by storage date in YYYY-MM-DD format. If omitted, all dates are exported.',
    example: '2026-06-01',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual FG location   Excel downloaded successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Bearer token is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only ADMIN can access this API.',
  })
  downloadExcel(
    @Query('salesOrderNumber') salesOrderNumber: string | undefined,
    @Query('date') date: string | undefined,
    @Res() res: Response,
  ) {
    return this.service.downloadExcel(salesOrderNumber, date, res);
  }

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Save single or multiple manual FG storage details without authorization',
  })
  @ApiResponse({
    status: 201,
    description: 'Manual FG storage details saved successfully.',
  })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/CreateManualFgStorageDto' },
        {
          type: 'array',
          items: { $ref: '#/components/schemas/CreateManualFgStorageDto' },
        },
      ],
    },
  })
  create(
    @Body(ManualFgStoragePayloadPipe)
    dto: CreateManualFgStorageDto | CreateManualFgStorageDto[],
  ) {
    return Array.isArray(dto)
      ? this.service.createMany(dto)
      : this.service.create(dto);
  }
}
