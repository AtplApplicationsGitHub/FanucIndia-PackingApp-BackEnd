import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { logger } from './logger'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const responsePayload = exception instanceof HttpException
      ? (exception.getResponse() as any)
      : {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again later.',
        }

    logger.error(
      {
        component: 'exception-filter',
        status,
        path: req.url,
        requestId: req.headers['x-request-id'],
        code: responsePayload.code,
      },
      exception instanceof Error ? exception.stack! : String(exception)
    )

    res.status(status).json({
      code: responsePayload.code,
      message: responsePayload.message,
      details: responsePayload.details ?? null,
    })
  }
}
