import { Controller, Get, Param, NotFoundException, ParseIntPipe, UseGuards } from '@nestjs/common';
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
