import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  NotFoundException,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { UserDashboardService } from './user-dashboard.service';
import { UpdateMaterialDataDto } from './dto/update-material-data.dto';

const storageOptions = {
  storage: diskStorage({
    destination: './temp_uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname),
      );
    },
  }),
};

@ApiTags('User Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-dashboard')
export class UserDashboardController {
  constructor(private readonly userDashboardService: UserDashboardService) {}

  @Get('orders')
  @Roles('USER')
  getAssignedOrders(@Req() req: AuthRequest) {
    return this.userDashboardService.findAssignedOrders(req.user.userId);
  }

  @Get('orders-summary')
  @Roles('USER')
  getAssignedOrdersSummary(@Req() req: AuthRequest) {
    return this.userDashboardService.getAssignedOrdersSummary(req.user.userId);
  }
  
  // --- NEW ENDPOINT TO FIX 404 ---
  @Get('orders/:id')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'Get details for a specific sales order by ID' })
  @ApiResponse({ status: 200, description: 'Sales order details returned' })
  @ApiResponse({ status: 404, description: 'Order not found or access denied' })
  async getOrderDetails(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    const { userId, role } = req.user;
    return this.userDashboardService.findOrderById(id, userId, role);
  }

  @Get('orders/:id/download-details')
  @Roles('USER', 'ADMIN')
  async downloadOrderDetails(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.userDashboardService.downloadOrderDetails(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  @Get('orders/son/:soNumber/download-details')
  @Roles('USER', 'ADMIN')
  async downloadOrderDetailsBySoNumber(
    @Param('soNumber') soNumber: string,
    @Req() req: AuthRequest,
  ) {
    return this.userDashboardService.downloadOrderDetailsBySoNumber(
      soNumber,
      req.user.userId,
      req.user.role,
    );
  }

  // --- All 3 Upload Endpoints ---
  @Post('orders/son/:soNumber/sync')
  @Roles('USER')
  @UseInterceptors(FileFieldsInterceptor([
      { name: 'data', maxCount: 1 },
      { name: 'attachments', maxCount: 10 },
    ], storageOptions),
  )
  @ApiOperation({ summary: 'Sync both material data and attachments using SO Number' })
  @ApiConsumes('multipart/form-data')
  async syncOrderBySoNumber(
    @Param('soNumber') soNumber: string,
    @Req() req: AuthRequest,
    @UploadedFiles() files: { data?: Express.Multer.File[]; attachments?: Express.Multer.File[] },
  ) {
    if (!files.data || !files.data[0]) {
      throw new BadRequestException('Data file is required for sync.');
    }
    const dataFile = files.data[0];
    const attachments = files.attachments || [];
    try {
      const fileContent = fs.readFileSync(dataFile.path, 'utf8').trim();
      const parsedArray = JSON.parse(fileContent);
      fs.unlinkSync(dataFile.path);
      const jsonData: UpdateMaterialDataDto = { materials: parsedArray };
      return this.userDashboardService.syncOrderBySoNumber(soNumber, req.user, jsonData, attachments);
    } catch (error) {
      console.error('JSON Parsing or File Read Error:', error);
      throw new BadRequestException('Invalid JSON data file.');
    }
  }

  @Post('orders/son/:soNumber/data')
  @Roles('USER')
  @UseInterceptors(FileInterceptor('data', storageOptions))
  @ApiOperation({ summary: 'Upload only material data using SO Number' })
  @ApiConsumes('multipart/form-data')
  async uploadDataBySoNumber(
    @Param('soNumber') soNumber: string,
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No data file uploaded.');
    }
    try {
      const fileContent = fs.readFileSync(file.path, 'utf8').trim();
      const parsedArray = JSON.parse(fileContent);
      fs.unlinkSync(file.path);
      const jsonData: UpdateMaterialDataDto = { materials: parsedArray };
      return this.userDashboardService.updateDataBySoNumber(soNumber, req.user, jsonData);
    } catch (error) {
      console.error('JSON Parsing or File Read Error:', error);
      throw new BadRequestException('Invalid JSON data file.');
    }
  }

  @Post('orders/son/:soNumber/attachments')
  @Roles('USER')
  @UseInterceptors(FilesInterceptor('attachments', 10, storageOptions))
  @ApiOperation({ summary: 'Upload only attachments using SO Number' })
  @ApiConsumes('multipart/form-data')
  async uploadAttachmentsBySoNumber(
    @Param('soNumber') soNumber: string,
    @Req() req: AuthRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.userDashboardService.uploadAttachmentsBySoNumber(soNumber, req.user, files);
  }
}