import { Controller, Get, Param, NotFoundException, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@Controller('admin/sales-orders')
@UseGuards(JwtAuthGuard) 
export class AdminSalesOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('counts/dynamic')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get dynamic counts of R105, W105 and Pending Imports based on filters' })
  async getDynamicCounts(@Query() query: any) {
    const { search, paymentFilter, zoneFilter, statusFilter, customerFilter, startDate, endDate, pendingImportFilter } = query;
    const where: any = {};
    
    const baseStatusCondition = { OR: [{ status: 'R105' }, { status: 'W105' }] };

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

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.deliveryDate = dateFilter;
    }

    if (search) {
      const lower = search.toLowerCase();
      const num = Number(search);
      where.AND = [{
        OR: [
          { customer: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { product: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { transporter: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { plantCode: { contains: search, mode: 'insensitive' } },
          { salesZone: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { packConfig: { is: { configName: { contains: search, mode: 'insensitive' } } } },
          { assignedUser: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { saleOrderNumber: { contains: search, mode: 'insensitive' } },
          { outboundDelivery: { contains: search, mode: 'insensitive' } },
          { transferOrder: { contains: search, mode: 'insensitive' } },
          { status: { contains: search, mode: 'insensitive' } },
          { customerNameText: { contains: search, mode: 'insensitive' } },
          ...(lower === 'yes' || lower === 'no' ? [{ paymentClearance: { equals: lower === 'yes' } }] : []),
          ...(!isNaN(num) ? [{ priority: { equals: num } }] : []),
        ]
      }];
    }

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
       pendingImportWhere.AND = pendingImportWhere.AND.filter((cond: any) => cond !== baseStatusCondition);
    } else {
       pendingImportWhere.AND = [];
    }
    
    if (!statusFilter) {
      pendingImportWhere.AND.push({
        OR: [{ status: null }, { status: 'R105' }, { status: 'W105' }]
      });
    }
    
    const pendingImportCount = await this.prisma.salesOrder.count({
      where: { ...pendingImportWhere, isErpImported: 0 },
    });

    const counts = { R105: 0, W105: 0, PendingImport: pendingImportCount };
    results.forEach(r => {
      if (r.status === 'R105') counts.R105 = r._count.status;
      if (r.status === 'W105') counts.W105 = r._count.status;
    });

    return counts;
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a specific sales order by its ID' })
  @ApiParam({ name: 'id', description: 'The ID of the sales order', type: Number })
  @ApiResponse({ status: 200, description: 'Sales order details returned successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User does not have the required role.' })
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
}
