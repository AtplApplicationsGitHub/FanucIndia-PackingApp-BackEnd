import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Get,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { VehicleEntryService } from './vehicle-entry.service';
import { CreateVehicleEntryDto } from './dto/create-vehicle-entry.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@ApiTags('Vehicle Entry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicle-entry')
export class VehicleEntryController {
  constructor(private readonly service: VehicleEntryService) { }

  @Post()
  @Roles('USER')
  @ApiOperation({ summary: 'Save new vehicle entry details' })
  @ApiResponse({ status: 201, description: 'Entry created successfully.' })
  create(@Body() dto: CreateVehicleEntryDto, @Req() req: AuthRequest) {
    return this.service.create(dto, req.user.userId);
  }

  @Post(':id/attachments')
  @Roles('USER')
  @ApiOperation({ summary: 'Upload photos for a vehicle entry' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: { fileSize: 200 * 1024 * 1024 }
  }))
  uploadAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthRequest,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    return this.service.uploadAttachments(id, files, req.user.userId);
  }

  @Get(':id/attachments')
  @Roles('ADMIN', 'USER', 'SALES')
  @ApiOperation({ summary: 'Get the list of uploaded attachments for a vehicle entry' })
  @ApiResponse({ status: 200, description: 'Returns an array of attachment objects.' })
  @ApiResponse({ status: 404, description: 'Vehicle Entry not found.' })
  getAttachments(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAttachments(id);
  }

  @Get(':id/attachments/:fileName')
  @Roles('ADMIN', 'USER', 'SALES')
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    return this.service.getAttachmentStream(id, fileName, res);
  }
}