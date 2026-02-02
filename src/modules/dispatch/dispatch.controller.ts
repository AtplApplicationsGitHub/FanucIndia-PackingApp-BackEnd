import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { DispatchService } from './dispatch.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { CreateMobileDispatchDto } from './dto/create-mobile-dispatch.dto';
import { UpdateMobileDispatchDto } from './dto/update-mobile-dispatch.dto';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @Roles('ADMIN', 'USER')
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    limits: { fileSize: 200 * 1024 * 1024 }
  }))
    create(
    @Body() createDispatchDto: CreateDispatchDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthRequest,
  ) {
    return this.dispatchService.create(
      createDispatchDto,
      files,
      req.user.userId,
    );
  }

  @Post('mobile/header')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Step 1 (Mobile): Create dispatch header with ID or Name for Customer/Transporter.' })
  @ApiBody({
    description: 'Provide either customerId OR customerName. Provide either transporterId OR transporterName (optional).',
    type: CreateMobileDispatchDto, 
  })
  createMobileDispatchHeader(
    @Body() dto: CreateMobileDispatchDto, 
    @Req() req: AuthRequest,
  ) {
    return this.dispatchService.createMobileDispatchHeader(dto, req.user.userId);
  }

  @Post('mobile/:id/attachments')
  @Roles('ADMIN', 'USER')
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    limits: { fileSize: 200 * 1024 * 1024 }
  }))
  @ApiOperation({ summary: 'Step 2 (Mobile): Upload attachments for a dispatch record.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
      schema: {
          type: 'object',
          properties: { attachments: { type: 'array', items: { type: 'string', format: 'binary' } } },
      },
  })
  addMobileAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
        throw new BadRequestException('No attachment files provided.');
    }
    return this.dispatchService.addMobileAttachments(id, files);
  }

  @Post('mobile/:id/so')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Step 3 (Mobile): Link a Sales Order and update its status to Dispatched.' })
  addMobileDispatchSO(
    @Param('id', ParseIntPipe) id: number,
    @Body('saleOrderNumber') saleOrderNumber: string,
    @Req() req: AuthRequest,
  ) {
    if (!saleOrderNumber) {
        throw new BadRequestException('saleOrderNumber is required.');
    }
    return this.dispatchService.addMobileDispatchSO(id, saleOrderNumber, req.user.userId);
  }

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Get all dispatches with optional date filtering' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dispatchService.findAll(startDate, endDate);
  }

  @Get(':id/attachments')
  @Roles('ADMIN', 'USER') 
  @ApiOperation({ summary: 'Get the list of attachments for a specific dispatch ID' })
  @ApiParam({ name: 'id', description: 'The ID of the dispatch record', type: Number })
  @ApiResponse({ status: 200, description: 'Returns an array of attachment objects.' })
  @ApiResponse({ status: 404, description: 'Dispatch not found.' })
  findAttachments(@Param('id', ParseIntPipe) id: number) {
    return this.dispatchService.findAttachmentsByDispatchId(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDispatchDto: UpdateDispatchDto,
    @Req() req: AuthRequest,
  ) {
    return this.dispatchService.update(id, updateDispatchDto, req.user.userId); 
  }

  @Patch('mobile/:id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Update dispatch details (Mobile). Handles Customer/Transporter by ID or Name.' })
  @ApiParam({ name: 'id', description: 'The ID of the dispatch record to update', type: Number })
  @ApiBody({ type: UpdateMobileDispatchDto })
  updateMobileDispatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMobileDispatchDto,
    @Req() req: AuthRequest,
  ) {
    if (!dto.customerId && !dto.customerName) {
      throw new BadRequestException('Either customerId or customerName must be provided.');
    }
     if (!dto.transporterId && !dto.transporterName) {
      throw new BadRequestException('Either transporterId or transporterName must be provided.');
    }

    return this.dispatchService.updateMobileDispatch(id, dto, req.user.userId);
  }

  @Get(':id/so')
  @Roles('ADMIN', 'USER')
  findDispatchSOs(@Param('id', ParseIntPipe) id: number) {
    return this.dispatchService.findDispatchSOs(id);
  }

  @Post(':id/so')
  @Roles('ADMIN', 'USER')
  addDispatchSO(
    @Param('id', ParseIntPipe) id: number,
    @Body('saleOrderNumber') saleOrderNumber: string,
    @Req() req: AuthRequest,
  ) {
    return this.dispatchService.addDispatchSO(id, saleOrderNumber, req.user.userId);
  }
  
  @Delete('so/:soId')
  @Roles('ADMIN', 'USER')
  removeDispatchSO(@Param('soId', ParseIntPipe) soId: number, @Req() req: AuthRequest) {
    return this.dispatchService.removeDispatchSO(soId, req.user.userId);
  }

  @Get(':id/pdf')
  @Roles('ADMIN', 'USER')
  async generatePdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.dispatchService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=dispatch_${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Post(':id/attachments')
  @Roles('ADMIN', 'USER')
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    limits: { fileSize: 200 * 1024 * 1024 }
  }))
  addAttachments(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.dispatchService.addAttachments(id, files);
  }

  @Delete(':id/attachments')
  @Roles('ADMIN', 'USER')
  deleteAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Body('fileName') fileName: string,
  ) {
    if (!fileName) {
      throw new BadRequestException('fileName is required');
    }
    return this.dispatchService.deleteAttachment(id, fileName);
  }

  @Get(':id/attachments/:fileName')
  @Roles('ADMIN', 'USER', 'SALES')
  async downloadDispatchAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType } = await this.dispatchService.getAttachmentStream(id, fileName);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    stream.pipe(res);
  }
}
