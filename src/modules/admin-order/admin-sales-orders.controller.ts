import { Controller, Get, Param, NotFoundException, ParseIntPipe } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Controller('admin/sales-orders')
export class AdminSalesOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
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
