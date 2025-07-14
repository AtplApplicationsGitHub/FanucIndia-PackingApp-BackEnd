import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSalesCrudDto } from './dto/create-sales-crud.dto';
import { UpdateSalesCrudDto } from './dto/update-sales-crud.dto';

@Injectable()
export class SalesCrudService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSalesCrudDto, userId: number) {
    try {
      const deliveryDate =
        dto.deliveryDate && dto.deliveryDate.length === 10
          ? new Date(dto.deliveryDate).toISOString()
          : dto.deliveryDate;

      const result = await this.prisma.salesOrder.create({
        data: {
          ...dto,
          deliveryDate,
          userId,
        },
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  async findAll(userId: number, query: any) {
    const results = await this.prisma.salesOrder.findMany({
      where: { userId },
      include: {
        product: true,
        transporter: true,
        plantCode: true,
        salesZone: true,
        packConfig: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return results;
  }

  async findOne(id: number, userId: number) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async update(id: number, dto: UpdateSalesCrudDto, userId: number) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order || order.userId !== userId) {
      throw new ForbiddenException('You can only update your own orders');
    }
    
    return this.prisma.salesOrder.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, userId: number) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order || order.userId !== userId) {
      throw new ForbiddenException('You can only delete your own orders');
    }
    
    return this.prisma.salesOrder.delete({ where: { id } });
  }
}
