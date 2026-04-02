import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  UploadedFiles,
  Query,
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
import * as os from 'os';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { UserDashboardService } from './user-dashboard.service';
import { UpdateMaterialDataDto } from './dto/update-material-data.dto';

const storageOptions = {
  storage: diskStorage({
    destination: os.tmpdir(),
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
  @ApiOperation({ summary: 'Download material details by order ID' })
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

  // Legacy endpoint. Prefer ID-based API in mobile/web clients.
  @Get('orders/son/:soNumber/download-details')
  @Roles('USER', 'ADMIN')
  @ApiOperation({
    summary:
      'Legacy: Download material details by SO Number. Prefer order ID route.',
  })
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

  @Get('stats')
  @Roles('USER')
  @ApiOperation({
    summary: 'Get specific stats for User Dashboard (Assigned Count)',
  })
  async getUserDashboardStats(
    @Req() req: AuthRequest,
    @Query('date') dateStr?: string,
  ) {
    return this.userDashboardService.getDashboardStats(
      req.user.userId,
      dateStr,
    );
  }

  @Get('recent-activity')
  @Roles('USER')
  @ApiOperation({ summary: 'Get recent activity feed for User Dashboard' })
  async getUserRecentActivity(@Req() req: AuthRequest) {
    return this.userDashboardService.getRecentActivity(req.user.userId);
  }

  @Post('orders/:id/sync')
  @Roles('USER')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'data', maxCount: 1 },
        { name: 'attachments', maxCount: 10 },
      ],
      storageOptions,
    ),
  )
  @ApiOperation({
    summary: 'Sync both material data and attachments using Order ID',
  })
  @ApiConsumes('multipart/form-data')
  async syncOrderById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @UploadedFiles()
    files: {
      data?: Express.Multer.File[];
      attachments?: Express.Multer.File[];
    },
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
      return this.userDashboardService.syncOrderById(
        id,
        req.user,
        jsonData,
        attachments,
      );
    } catch (error) {
      console.error('JSON Parsing or File Read Error:', error);
      throw new BadRequestException('Invalid JSON data file.');
    }
  }

  @Post('orders/:id/data')
  @Roles('USER')
  @UseInterceptors(FileInterceptor('data', storageOptions))
  @ApiOperation({ summary: 'Upload only material data using Order ID' })
  @ApiConsumes('multipart/form-data')
  async uploadDataById(
    @Param('id', ParseIntPipe) id: number,
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
      return this.userDashboardService.updateDataById(id, req.user, jsonData);
    } catch (error) {
      console.error('JSON Parsing or File Read Error:', error);
      throw new BadRequestException('Invalid JSON data file.');
    }
  }

  @Post('orders/:id/attachments')
  @Roles('USER')
  @UseInterceptors(FilesInterceptor('attachments', 10, storageOptions))
  @ApiOperation({ summary: 'Upload only attachments using Order ID' })
  @ApiConsumes('multipart/form-data')
  async uploadAttachmentsById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.userDashboardService.uploadAttachmentsById(id, req.user, files);
  }

  // Legacy endpoint. Prefer ID-based API in mobile/web clients.
  @Post('orders/son/:soNumber/sync')
  @Roles('USER')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'data', maxCount: 1 },
        { name: 'attachments', maxCount: 10 },
      ],
      storageOptions,
    ),
  )
  @ApiOperation({
    summary:
      'Legacy: Sync both material data and attachments using SO Number. Prefer order ID route.',
  })
  @ApiConsumes('multipart/form-data')
  async syncOrderBySoNumber(
    @Param('soNumber') soNumber: string,
    @Req() req: AuthRequest,
    @UploadedFiles()
    files: {
      data?: Express.Multer.File[];
      attachments?: Express.Multer.File[];
    },
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
      return this.userDashboardService.syncOrderBySoNumber(
        soNumber,
        req.user,
        jsonData,
        attachments,
      );
    } catch (error) {
      console.error('JSON Parsing or File Read Error:', error);
      throw new BadRequestException('Invalid JSON data file.');
    }
  }

  // Legacy endpoint. Prefer ID-based API in mobile/web clients.
  @Post('orders/son/:soNumber/data')
  @Roles('USER')
  @UseInterceptors(FileInterceptor('data', storageOptions))
  @ApiOperation({
    summary:
      'Legacy: Upload only material data using SO Number. Prefer order ID route.',
  })
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
      return this.userDashboardService.updateDataBySoNumber(
        soNumber,
        req.user,
        jsonData,
      );
    } catch (error) {
      console.error('JSON Parsing or File Read Error:', error);
      throw new BadRequestException('Invalid JSON data file.');
    }
  }

  // Legacy endpoint. Prefer ID-based API in mobile/web clients.
  @Post('orders/son/:soNumber/attachments')
  @Roles('USER')
  @UseInterceptors(FilesInterceptor('attachments', 10, storageOptions))
  @ApiOperation({
    summary:
      'Legacy: Upload only attachments using SO Number. Prefer order ID route.',
  })
  @ApiConsumes('multipart/form-data')
  async uploadAttachmentsBySoNumber(
    @Param('soNumber') soNumber: string,
    @Req() req: AuthRequest,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.userDashboardService.uploadAttachmentsBySoNumber(
      soNumber,
      req.user,
      files,
    );
  }
}