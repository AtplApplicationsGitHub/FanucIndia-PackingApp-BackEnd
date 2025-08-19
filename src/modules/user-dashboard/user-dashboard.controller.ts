import { Controller, Get, Param, ParseIntPipe, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { UserDashboardService } from './user-dashboard.service';

@ApiTags('User Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-dashboard')
export class UserDashboardController {
  constructor(private readonly userDashboardService: UserDashboardService) {}

  @Get('orders')
  @Roles('user')
  @ApiOperation({ summary: "Get all sales orders assigned to the logged-in user" })
  @ApiResponse({ status: 200, description: 'Assigned orders returned successfully' })
  getAssignedOrders(@Req() req: AuthRequest) {
    const userId = req.user.userId;
    return this.userDashboardService.findAssignedOrders(userId);
  }

  @Get('orders/:id')
  @Roles('user', 'admin') // Allow both users and admins to access this
  @ApiOperation({ summary: "Get details for a specific sales order" })
  @ApiResponse({ status: 200, description: 'Sales order details returned' })
  @ApiResponse({ status: 404, description: 'Order not found or access denied' })
  async getOrderDetails(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user.userId;
    const userRole = req.user.role;

    const order = await this.userDashboardService.findOrderById(id, userId, userRole);

    if (!order) {
      throw new NotFoundException('Sales order not found or you do not have permission to view it.');
    }
    return order;
  }
}
