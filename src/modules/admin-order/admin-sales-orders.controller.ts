import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Param,
  NotFoundException,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getDateOnlyRange } from '../../common/utils/date-only.util';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SambaService } from '../samba/samba.service';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@Controller('admin/sales-orders')
@UseGuards(JwtAuthGuard)
export class AdminSalesOrdersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sambaService: SambaService,
  ) {}

  @Get('counts/dynamic')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Get dynamic counts of R105, W105, Pending Imports, and Failed Imports based on filters',
  })
  async getDynamicCounts(@Query() query: any) {
    const {
      search,
      paymentFilter,
      zoneFilter,
      statusFilter,
      customerFilter,
      startDate,
      endDate,
      pendingImportFilter,
      failedImportFilter,
    } = query;
    const where: any = {};

    const baseStatusCondition = {
      OR: [{ status: 'R105' }, { status: 'W105' }],
    };

    if (paymentFilter) {
      where.paymentClearance = paymentFilter === 'true';
    }
    if (zoneFilter) {
      where.salesZoneId = parseInt(zoneFilter, 10);
    }
    if (statusFilter) {
      if (statusFilter === 'None') where.status = null;
      else where.status = statusFilter;
    }
    if (customerFilter) {
      where.customerId = parseInt(customerFilter, 10);
    }
    if (pendingImportFilter === 'true') {
      where.isErpImported = 0;
    }

    const deliveryDateRange = getDateOnlyRange(startDate, endDate);

    if (deliveryDateRange) {
      where.deliveryDate = deliveryDateRange;
    }

    if (search) {
      const lower = search.toLowerCase();
      const num = Number(search);
      where.AND = [
        {
          OR: [
            {
              customer: {
                is: { name: { contains: search, mode: 'insensitive' } },
              },
            },
            {
              user: { is: { name: { contains: search, mode: 'insensitive' } } },
            },
            {
              product: {
                is: { name: { contains: search, mode: 'insensitive' } },
              },
            },
            {
              transporter: {
                is: { name: { contains: search, mode: 'insensitive' } },
              },
            },
            { plantCode: { contains: search, mode: 'insensitive' } },
            {
              salesZone: {
                is: { name: { contains: search, mode: 'insensitive' } },
              },
            },
            {
              packConfig: {
                is: { configName: { contains: search, mode: 'insensitive' } },
              },
            },
            {
              assignedUser: {
                is: { name: { contains: search, mode: 'insensitive' } },
              },
            },
            { saleOrderNumber: { contains: search, mode: 'insensitive' } },
            { outboundDelivery: { contains: search, mode: 'insensitive' } },
            { transferOrder: { contains: search, mode: 'insensitive' } },
            { status: { contains: search, mode: 'insensitive' } },
            { customerNameText: { contains: search, mode: 'insensitive' } },
            ...(lower === 'yes' || lower === 'no'
              ? [{ paymentClearance: { equals: lower === 'yes' } }]
              : []),
            ...(!isNaN(num) ? [{ priority: { equals: num } }] : []),
          ],
        },
      ];
    }

    const failedLogs = await this.prisma.eRP_Data_Cron_Logs.findMany({
      where: { status: 'Failed' },
      select: { saleOrderNumber: true },
      distinct: ['saleOrderNumber'],
    });

    const failedLogKeySet = new Set(
      failedLogs.map((log) => log.saleOrderNumber),
    );

    if (!where.AND) {
      where.AND = [baseStatusCondition];
    } else {
      where.AND.push(baseStatusCondition);
    }

    const results = await this.prisma.salesOrder.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const pendingImportWhere = { ...where };
    if (pendingImportWhere.AND) {
      pendingImportWhere.AND = pendingImportWhere.AND.filter(
        (cond: any) => cond !== baseStatusCondition,
      );
    } else {
      pendingImportWhere.AND = [];
    }

    if (!statusFilter) {
      pendingImportWhere.AND.push({
        OR: [{ status: null }, { status: 'R105' }, { status: 'W105' }],
      });
    }

    const pendingImportCount = await this.prisma.salesOrder.count({
      where: { ...pendingImportWhere, isErpImported: 0 },
    });

    const failedImportWhere = { ...pendingImportWhere };
    delete failedImportWhere.saleOrderNumber;

    const failedCandidates = await this.prisma.salesOrder.findMany({
      where: {
        ...failedImportWhere,
        isErpImported: 0,
      },
      select: {
        id: true,
        saleOrderNumber: true,
        outboundDelivery: true,
        status: true,
      },
    });

    const failedOrderIds = failedCandidates
      .filter(
        (order) =>
          !!order.saleOrderNumber &&
          !!order.outboundDelivery &&
          failedLogKeySet.has(
            `${order.saleOrderNumber}_${order.outboundDelivery}`,
          ),
      )
      .map((order) => order.id);

    const erpImportFailedCount = failedOrderIds.length;
    const erpSuccessUploadCount = await this.prisma.salesOrder.count({
      where: {
        ...pendingImportWhere,
        isErpImported: 1,
      },
    });
    const counts = {
      R105: 0,
      W105: 0,
      PendingImport: pendingImportCount,
      ErpImportFailed: erpImportFailedCount,
      ErpSuccessUpload: erpSuccessUploadCount,
    };
    results.forEach((r) => {
      if (r.status === 'R105') counts.R105 = r._count.status;
      if (r.status === 'W105') counts.W105 = r._count.status;
    });

    return counts;
  }

  @Get('counts/erp-import-failed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get failed ERP import count from cron logs' })
  @ApiQuery({
    name: 'date',
    required: false,
    description:
      'Optional date in YYYY-MM-DD format (IST). Defaults to last 7 days if not provided.',
  })
  @ApiResponse({
    status: 200,
    description: 'Failed ERP import count returned successfully.',
  })
  async getErpImportFailedCount(@Query('date') date?: string) {
    const failedCount = await this.sambaService.getErpImportFailedCount(date);
    return { ErpImportFailed: failedCount };
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a specific sales order by its ID' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the sales order',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Sales order details returned successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User does not have the required role.',
  })
  @ApiResponse({ status: 404, description: 'Sales order not found.' })
  async getSalesOrderById(@Param('id', ParseIntPipe) id: number) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!order) {
      throw new NotFoundException('Sales order not found');
    }

    return order;
  }

  @Post('download-failed-erp')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Download failed ERP data Excel files' })
  async downloadFailedErp(
    @Body() body: { orderIds: number[] },
    @Res() res: Response,
  ) {
    try {
      const { type, stream, filename, missing } =
        await this.sambaService.downloadFailedErpData(body.orderIds);

      if (type === 'file') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
      } else {
        res.setHeader('Content-Type', 'application/zip');
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      if (missing && missing.length > 0) {
        res.setHeader('X-Missing-Orders', missing.join(','));
      }

      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Disposition, X-Missing-Orders',
      );

      stream.pipe(res);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        return res.status(404).json({
          message: error.message,
          missing: body.orderIds,
        });
      }

      return res.status(500).json({
        message: 'Failed to download ERP data',
        error: error.message,
      });
    }
  }
}
