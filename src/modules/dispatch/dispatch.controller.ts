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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { DispatchService } from './dispatch.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { UpdateDispatchDto } from './dto/update-dispatch.dto';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @Roles('ADMIN', 'USER')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: diskStorage({
        destination: './temp_uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
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

  @Get()
  @Roles('ADMIN', 'USER')
  findAll() {
    return this.dispatchService.findAll();
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDispatchDto: UpdateDispatchDto,
  ) {
    return this.dispatchService.update(id, updateDispatchDto);
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
  ) {
    return this.dispatchService.addDispatchSO(id, saleOrderNumber);
  }

  @Delete('so/:soId')
  @Roles('ADMIN', 'USER')
  removeDispatchSO(@Param('soId', ParseIntPipe) soId: number) {
    return this.dispatchService.removeDispatchSO(soId);
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
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: diskStorage({
        destination: './temp_uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
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
