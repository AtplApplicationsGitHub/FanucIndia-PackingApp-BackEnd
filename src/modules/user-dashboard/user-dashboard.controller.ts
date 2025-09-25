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
  @Roles('USER')
  @ApiOperation({ summary: "Get all sales orders assigned to the logged-in user" })
  @ApiResponse({ status: 200, description: 'Assigned orders returned successfully' })
  getAssignedOrders(@Req() req: AuthRequest) {
    const userId = req.user.userId;
    return this.userDashboardService.findAssignedOrders(userId);
  }

  @Get('orders/:id')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: "Get details for a specific sales order by ID" })
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

  @Get('orders-summary')
  @Roles('USER')
  @ApiOperation({ summary: "Get a summary of sales orders assigned to the logged-in user" })
  @ApiResponse({ status: 200, description: 'Assigned orders summary returned successfully' })
  getAssignedOrdersSummary(@Req() req: AuthRequest) {
    const userId = req.user.userId;
    return this.userDashboardService.getAssignedOrdersSummary(userId);
  }

  @Get('orders/:id/download-details')
  @Roles('USER')
  @ApiOperation({ summary: "Download material details using the Order ID" })
  @ApiResponse({ status: 200, description: 'Material details returned successfully' })
  @ApiResponse({ status: 404, description: 'Order not found or access denied' })
  async downloadOrderDetails(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const { userId, role } = req.user;
    return this.userDashboardService.downloadOrderDetails(id, userId, role);
  }
  
  @Get('orders/son/:soNumber/download-details')
  @Roles('USER')
  @ApiOperation({ summary: "Download material details using the SO Number" })
  @ApiResponse({ status: 200, description: 'Material details returned successfully' })
  @ApiResponse({ status: 404, description: 'Order not found or access denied' })
  async downloadOrderDetailsBySoNumber(
    @Param('soNumber') soNumber: string,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.userDashboardService.downloadOrderDetailsBySoNumber(soNumber, userId, role);
  }
}