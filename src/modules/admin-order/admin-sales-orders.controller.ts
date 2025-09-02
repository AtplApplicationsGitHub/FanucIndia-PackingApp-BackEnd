import { Controller, Get, Param, NotFoundException, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/sales-orders')
@UseGuards(JwtAuthGuard) // Ensure user is logged in for all routes in this controller
export class AdminSalesOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  @Roles('ADMIN')
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
