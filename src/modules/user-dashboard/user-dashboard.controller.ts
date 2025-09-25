// import { Controller, Get, Post, Param, ParseIntPipe, Req, UseGuards, NotFoundException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
// import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { Roles } from '../auth/roles.decorator';
// import { AuthRequest } from '../auth/types/auth-request.type';
// import { UserDashboardService } from './user-dashboard.service';
// import { UpdateMaterialDataDto } from './dto/update-material-data.dto';

// @ApiTags('User Dashboard')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('user-dashboard')
// export class UserDashboardController {
//   constructor(private readonly userDashboardService: UserDashboardService) {}

//   @Get('orders')
//   @Roles('USER')
//   @ApiOperation({ summary: "Get all sales orders assigned to the logged-in user" })
//   @ApiResponse({ status: 200, description: 'Assigned orders returned successfully' })
//   getAssignedOrders(@Req() req: AuthRequest) {
//     const userId = req.user.userId;
//     return this.userDashboardService.findAssignedOrders(userId);
//   }

//   @Get('orders-summary')
//   @Roles('USER')
//   @ApiOperation({ summary: "Get a summary of sales orders assigned to the logged-in user" })
//   @ApiResponse({ status: 200, description: 'Assigned orders summary returned successfully' })
//   getAssignedOrdersSummary(@Req() req: AuthRequest) {
//     const userId = req.user.userId;
//     return this.userDashboardService.getAssignedOrdersSummary(userId);
//   }
  
//   @Get('orders/:id')
//   @Roles('USER', 'ADMIN')
//   @ApiOperation({ summary: "Get details for a specific sales order by ID" })
//   @ApiResponse({ status: 200, description: 'Sales order details returned' })
//   @ApiResponse({ status: 404, description: 'Order not found or access denied' })
//   async getOrderDetails(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
//     const userId = req.user.userId;
//     const userRole = req.user.role;

//     const order = await this.userDashboardService.findOrderById(id, userId, userRole);

//     if (!order) {
//       throw new NotFoundException('Sales order not found or you do not have permission to view it.');
//     }
//     return order;
//   }

//   @Get('orders/:id/download-details')
//   @Roles('USER')
//   @ApiOperation({ summary: "Download material details using the Order ID" })
//   @ApiResponse({ status: 200, description: 'Material details returned successfully' })
//   @ApiResponse({ status: 404, description: 'Order not found or access denied' })
//   async downloadOrderDetails(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
//     const { userId, role } = req.user;
//     return this.userDashboardService.downloadOrderDetails(id, userId, role);
//   }
  
//   @Get('orders/son/:soNumber/download-details')
//   @Roles('USER', 'ADMIN')
//   @ApiOperation({ summary: "Download material details using the SO Number" })
//   @ApiResponse({ status: 200, description: 'Material details returned successfully' })
//   @ApiResponse({ status: 404, description: 'Order not found or access denied' })
//   async downloadOrderDetailsBySoNumber(
//     @Param('soNumber') soNumber: string,
//     @Req() req: AuthRequest,
//   ) {
//     const { userId, role } = req.user;
//     return this.userDashboardService.downloadOrderDetailsBySoNumber(soNumber, userId, role);
//   }

//   @Post('orders/:id/upload-details')
//   @Roles('USER')
//   @UseInterceptors(FileInterceptor('file'))
//   @ApiOperation({ summary: 'Upload and synchronize material details from a JSON file using Order ID' })
//   @ApiConsumes('multipart/form-data')
//   @ApiResponse({ status: 200, description: 'Data synchronized successfully' })
//   @ApiResponse({ status: 400, description: 'Invalid file or data format' })
//   async uploadOrderDetails(
//     @Param('id', ParseIntPipe) id: number,
//     @Req() req: AuthRequest,
//     @UploadedFile() file: Express.Multer.File,
//   ) {
//     if (!file) {
//       throw new BadRequestException('No file uploaded.');
//     }

//     const { userId, role } = req.user;
    
//     try {
//       const parsedArray = JSON.parse(file.buffer.toString());
//       const jsonData: UpdateMaterialDataDto = { materials: parsedArray };
//       return this.userDashboardService.uploadOrderDetails(id, userId, role, jsonData);
//     } catch (error) {
//       throw new BadRequestException('Invalid JSON file.');
//     }
//   }

//   @Post('orders/son/:soNumber/upload-details')
//   @Roles('USER')
//   @UseInterceptors(FileInterceptor('file'))
//   @ApiOperation({ summary: 'Upload and synchronize material details from a JSON file using SO Number' })
//   @ApiConsumes('multipart/form-data')
//   @ApiResponse({ status: 200, description: 'Data synchronized successfully' })
//   @ApiResponse({ status: 400, description: 'Invalid file or data format' })
//   async uploadOrderDetailsBySoNumber(
//     @Param('soNumber') soNumber: string,
//     @Req() req: AuthRequest,
//     @UploadedFile() file: Express.Multer.File,
//   ) {
//     if (!file) {
//       throw new BadRequestException('No file uploaded.');
//     }

//     const { userId, role } = req.user;
    
//     try {
//       const parsedArray = JSON.parse(file.buffer.toString());
//       const jsonData: UpdateMaterialDataDto = { materials: parsedArray };
//       return this.userDashboardService.uploadOrderDetailsBySoNumber(soNumber, userId, role, jsonData);
//     } catch (error) {
//       throw new BadRequestException('Invalid JSON file.');
//     }
//   }
// }

// backend/src/modules/user-dashboard/user-dashboard.controller.ts

import { Controller, Get, Post, Param, ParseIntPipe, Req, UseGuards, NotFoundException, UseInterceptors, UploadedFile, BadRequestException, UploadedFiles } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { UserDashboardService } from './user-dashboard.service';
import { UpdateMaterialDataDto } from './dto/update-material-data.dto';

@ApiTags('User Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-dashboard')
export class UserDashboardController {
  constructor(private readonly userDashboardService: UserDashboardService) {}

  // ... (all other GET endpoints remain unchanged) ...
  @Get('orders')
  @Roles('USER')
  @ApiOperation({ summary: "Get all sales orders assigned to the logged-in user" })
  @ApiResponse({ status: 200, description: 'Assigned orders returned successfully' })
  getAssignedOrders(@Req() req: AuthRequest) {
    const userId = req.user.userId;
    return this.userDashboardService.findAssignedOrders(userId);
  }

  @Get('orders-summary')
  @Roles('USER')
  @ApiOperation({ summary: "Get a summary of sales orders assigned to the logged-in user" })
  @ApiResponse({ status: 200, description: 'Assigned orders summary returned successfully' })
  getAssignedOrdersSummary(@Req() req: AuthRequest) {
    const userId = req.user.userId;
    return this.userDashboardService.getAssignedOrdersSummary(userId);
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
  @Roles('USER', 'ADMIN')
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

  @Post('orders/:id/upload-details')
  @Roles('USER')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'data', maxCount: 1 },
    { name: 'attachments', maxCount: 10 },
  ]))
  @ApiOperation({ summary: 'Upload and synchronize material data and attachments using Order ID' })
  @ApiConsumes('multipart/form-data')
  async uploadOrderDetails(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @UploadedFiles() files: { data?: Express.Multer.File[], attachments?: Express.Multer.File[] },
  ) {
    if (!files.data || !files.data[0]) {
      throw new BadRequestException('No data file uploaded.');
    }

    const { userId, role } = req.user;
    const dataFile = files.data[0];
    const attachments = files.attachments || [];
    
    try {
      const parsedArray = JSON.parse(dataFile.buffer.toString());
      const jsonData: UpdateMaterialDataDto = { materials: parsedArray };
      return this.userDashboardService.uploadOrderDetails(id, userId, role, jsonData, attachments);
    } catch (error) {
      throw new BadRequestException('Invalid JSON data file.');
    }
  }

  @Post('orders/son/:soNumber/upload-details')
  @Roles('USER')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'data', maxCount: 1 },
    { name: 'attachments', maxCount: 10 },
  ]))
  @ApiOperation({ summary: 'Upload and synchronize material data and attachments using SO Number' })
  @ApiConsumes('multipart/form-data')
  async uploadOrderDetailsBySoNumber(
    @Param('soNumber') soNumber: string,
    @Req() req: AuthRequest,
    @UploadedFiles() files: { data?: Express.Multer.File[], attachments?: Express.Multer.File[] },
  ) {
    if (!files.data || !files.data[0]) {
      throw new BadRequestException('No data file uploaded.');
    }

    const { userId, role } = req.user;
    const dataFile = files.data[0];
    const attachments = files.attachments || [];
    
    try {
      const parsedArray = JSON.parse(dataFile.buffer.toString());
      const jsonData: UpdateMaterialDataDto = { materials: parsedArray };
      return this.userDashboardService.uploadOrderDetailsBySoNumber(soNumber, userId, role, jsonData, attachments);
    } catch (error) {
      throw new BadRequestException('Invalid JSON data file.');
    }
  }
}