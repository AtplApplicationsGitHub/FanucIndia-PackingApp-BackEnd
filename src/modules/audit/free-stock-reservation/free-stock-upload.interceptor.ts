import { CallHandler, ExecutionContext, Injectable, NestInterceptor, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { extname } from 'path';
import { Request, Response } from 'express';
import { finalize, Observable } from 'rxjs';

const Upload = FileInterceptor('file', {
  storage: diskStorage({
    destination: tmpdir(),
    filename: (_request, _file, callback) => callback(null, `fanuc-free-stock-${randomUUID()}.xlsx`),
  }),
  limits: { files: 1 },
  fileFilter: (_request, file, callback) => {
    if (extname(file.originalname).toLowerCase() !== '.xlsx') {
      return callback(new BadRequestException('Only .xlsx files are supported.'), false);
    }
    callback(null, true);
  },
});

@Injectable()
export class FreeStockUploadInterceptor extends Upload implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    request.setTimeout(300000);
    response.setTimeout(300000);
    const cleanup = async () => {
      if (request.file?.path) await unlink(request.file.path).catch(() => undefined);
    };
    try {
      const stream = await super.intercept(context, next) as Observable<unknown>;
      return stream.pipe(finalize(() => { void cleanup(); }));
    } catch (error) {
      await cleanup();
      throw error;
    }
  }
}
