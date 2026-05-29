import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
import { ManualFgStorageService } from './manual-fg-storage.service';

@ApiTags('Manual FG Storage')
@Controller('manual-fg-storage')
export class ManualFgStorageController {
  constructor(private readonly service: ManualFgStorageService) {}

  @Get('list')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get manual FG storage list for web admin',
  })
  @ApiQuery({
    name: 'salesOrderNumber',
    required: false,
    description: 'Filter records by sales order number',
    example: 'SO12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual FG storage details fetched successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Bearer token is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only ADMIN can access this API.',
  })
  findAll(@Query('salesOrderNumber') salesOrderNumber?: string) {
    return this.service.findAll(salesOrderNumber);
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
