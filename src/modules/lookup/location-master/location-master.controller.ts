import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/roles.decorator';
import { extname } from 'node:path';
import { DeleteLocationQueryDto, LocationMasterQueryDto } from './location-master.dto';
import { readLocationWorkbook } from './location-master.excel';
import { LocationMasterService } from './location-master.service';

const LocationUpload = FileInterceptor('file', {
  limits: { files: 1 },
  fileFilter: (_request, file, callback) => {
    if (extname(file.originalname).toLowerCase() !== '.xlsx') {
      return callback(new BadRequestException('Only .xlsx files are supported.'), false);
    }
    callback(null, true);
  },
});

const FILE_BODY = {
  type: 'object',
  required: ['file'],
  properties: { file: { type: 'string', format: 'binary' } },
};

@ApiTags('Location Master')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller('locations')
export class LocationMasterController {
  constructor(private readonly service: LocationMasterService) {}

  @Get()
  @ApiOperation({
    summary: 'List racks with their rack numbers',
    description: 'Pagination counts racks. Each result contains id, plantCode, masterBarcode, and rackNumbers, which is empty for racks with no levels.',
  })
  list(@Query() query: LocationMasterQueryDto) {
    return this.service.list(query);
  }

  @Get('template')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Download the Excel template with all saved rack levels',
    description: 'Returns a blank template when the Location Master is empty. Append new rows below any existing rows.',
  })
  async template() {
    const buffer = await this.service.downloadWorkbook();
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="Location_Master_Template.xlsx"',
      length: buffer.length,
    });
  }

  @Post('uploads/preview')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(LocationUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_BODY })
  @ApiOperation({
    summary: 'Preview new rack levels and identify unchanged rows',
    description: 'Returns counts, Excel row numbers, row errors, and canImport. No data is saved.',
  })
  async preview(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Upload an Excel file in the file field.');
    return this.service.preview(await readLocationWorkbook(file.buffer));
  }

  @Post('uploads')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(LocationUpload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: FILE_BODY })
  @ApiOperation({
    summary: 'Revalidate and insert new rack levels atomically',
    description: 'Send the same workbook used for preview. Invalid batches return 400 with the current preview in details.',
  })
  async import(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Upload an Excel file in the file field.');
    return this.service.import(await readLocationWorkbook(file.buffer));
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete one rack level by Plant Code and Rack Number',
    description: 'The rack and its barcode assignment are retained even when its last level is removed.',
  })
  async deleteLevel(@Query() query: DeleteLocationQueryDto): Promise<void> {
    await this.service.deleteLevel(query);
  }
}
